defmodule Excess.Registry do
  use GenServer

  ## Client API

  @doc """
  Starts the registry.
  """
  def start_link(rooms, opts \\ []) do
    GenServer.start_link(__MODULE__, {rooms}, opts)
  end

  @doc """
  Looks up the room pid for `room_id` stored in `server`.

  Returns `{:ok, pid}` if the bucket exists, `:error` otherwise.
  """
  def lookup(server, name) do
    GenServer.call(server, {:lookup, name})
  end

  @doc """
  Ensures there is a room associated to the given `name` in `server`.
  """
  def create(server, name) do
    GenServer.cast(server, {:create, name})
  end

  @doc """
  Stops the registry.
  """
  def stop(server) do
    GenServer.call(server, :stop)
  end




  ## Server Callbacks

  def init({rooms}) do
    names = HashDict.new #Maps name of rooms to (Room) agent
    refs = HashDict.new #Maps PIDs to name of room

    {:ok, %{names: names, refs: refs, rooms: rooms}}
  end

  def handle_call({:lookup, name}, _from, state) do
    {:reply, HashDict.fetch(state.names, name), state}
  end

  def handle_cast({:create, name}, state) do

      if HashDict.get(state.names, name) do
        {:noreply, state}
      else
        {:ok, pid} = Excess.Room.Supervisor.start_room(state.rooms)
        ref = Process.monitor(pid)
        refs = HashDict.put(state.refs, ref, name)
        names = HashDict.put(state.names, name, pid)

        {:noreply, %{state | names: names, refs: refs}}
      end

  end

  def handle_info({:DOWN, ref, :process, pid, _reason}, state) do
    {name, refs} = HashDict.pop(state.refs, ref)
    names = HashDict.delete(state.names, name)
    {:noreply, %{state | names: names, refs: refs}}
  end



  def handle_call(:stop, _from, state) do
  {:stop, :normal, :ok, state}
  end

end
