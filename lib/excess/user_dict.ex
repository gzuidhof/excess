defmodule Excess.UserDict do
  use GenServer

  # Client

  def start_link (opts \\ []) do
    GenServer.start_link(__MODULE__, :ok, opts)
  end

  def get(pid, user) do
    GenServer.call(pid, {:get, user})
  end

  def delete(pid, user) do
    GenServer.call(pid, {:delete, user})
  end

  def put(pid, user, room) do
    GenServer.cast(pid, {:put, user, room})
  end

  # Server (callbacks)

  def init(:ok) do
    dict = HashDict.new
    {:ok, dict}
  end


  def handle_call({:get, user}, _from, dict) do
    {:reply, HashDict.get(dict, user), dict}
  end

  def handle_call({:delete, user}, _from, dict) do
    {:reply, :ok, HashDict.delete(dict, user)}
  end

  def handle_call(request, from, state) do
    super(request, from, state)
  end

  def handle_cast({:put, user, room},  dict) do
    {:noreply, HashDict.put(dict, user, room)}
  end

  def handle_cast(request, state) do
    super(request, state)
  end
end
