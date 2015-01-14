defmodule Excess.Room do
  @doc """
  Starts a new room.
  """
  def start_link do
    Agent.start_link(fn -> HashDict.new end)
  end

  @doc """
  Gets a user from the `room` by `user_id`.
  """
  def get(room, key) do
    Agent.get(room, &HashDict.get(&1, key))
  end

  @doc """
  Puts the `user` for the given `user_id` in the `room`.
  """
  def put(room, key, value) do
    Agent.update(room, &HashDict.put(&1, key, value))
  end

  @doc """
  Deletes `user` from `room`.

  Returns the current value of `user`, if `user` exists.
  """
  def delete(room, key) do
    val = Agent.get_and_update(room, &HashDict.pop(&1, key))

    if (Agent.get(room, &HashDict.size(&1)) < 1) do
      Agent.stop(room)
    end

    val
  end


end
