defmodule Excess.Supervisor do
  use Supervisor

  def start_link do
    Supervisor.start_link(__MODULE__, :ok)
  end

  @registry_sup_name Excess.Bucket.Supervisor
  @user_dict_name Excess.UserDict

  def init(:ok) do
    IO.puts "> Started Excess.Supervisor"
    children = [
      worker(Excess.UserDict, [[name: @user_dict_name]]),
      supervisor(Excess.RegistrySupervisor, [[name: @registry_sup_name]])
    ]

    supervise(children, strategy: :one_for_all)
  end

end
