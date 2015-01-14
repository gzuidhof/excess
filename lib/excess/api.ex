defmodule Excess.Api do
  require Logger


  def join_room(user_id, room_id, socket) do
    # Create room (will only create it if it already exists)
    room = Excess.Registry.create(Excess.Registry, room_id)
    Excess.Room.put(room, user_id, socket)
    Excess.UserDict.put(Excess.UserDict, user_id, room_id)

    {:ok, room_id}
  end

  defp delete_from_current_room(user_id) do
    current_room_id = Excess.UserDict.get(Excess.UserDict, user_id)


    case Excess.Registry.lookup(Excess.Registry, current_room_id) do
      {:ok, current_room} ->
        Excess.Room.delete(current_room, user_id)
      :error ->
        Logger.warn "User didn't seem to be in room #{current_room_id}?!"
    end

    {:ok, current_room_id}
  end

  def switch_room(user_id, room_id, socket) do
    {:ok, prev} = delete_from_current_room(user_id)
    join_room(user_id, room_id, socket)

    {:ok, prev}
  end


  def leave(user_id) do
    {:ok, previous_room_id} = delete_from_current_room(user_id)
    Excess.UserDict.delete(Excess.UserDict, user_id)

    {:ok, previous_room_id}
  end

  def get_users(room_id) do
    case Excess.Registry.lookup(Excess.Registry, room_id) do
      {:ok, room} ->
        Excess.Room.keys(room)
      :error ->
        []
    end
  end

  def get_user(user_id, room_id) do
    case Excess.Registry.lookup(Excess.Registry, room_id) do
      {:ok, room} ->
        Excess.Room.get(user_id, room_id)
      :error ->
        :error
    end
  end

end
