defmodule Excess.Room.Supervisor do
  use Supervisor

  def start_link(opts \\ []) do
    Supervisor.start_link(__MODULE__, :ok, opts)
  end

  def start_room(supervisor) do
    Supervisor.start_child(supervisor, [])
  end

  def init(:ok) do
    children = [
      worker(Excess.Room, [], restart: :temporary)
    ]

    supervise(children, strategy: :simple_one_for_one)
  end


end
