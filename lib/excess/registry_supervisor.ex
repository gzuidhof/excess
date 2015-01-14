defmodule Excess.RegistrySupervisor do
  use Supervisor

  def start_link(opts \\ []) do
    Supervisor.start_link(__MODULE__, :ok)
  end

  @registry_name Excess.Registry
  @room_sup_name Excess.Bucket.Supervisor

  def init(:ok) do
    IO.puts "> Started Excess.RegistrySupervisor (room data server)"
    children = [
      supervisor(Excess.Room.Supervisor, [[name: @room_sup_name]]),
      worker(Excess.Registry, [@room_sup_name, [name: @registry_name]])
    ]

    supervise(children, strategy: :one_for_one)
  end

end
