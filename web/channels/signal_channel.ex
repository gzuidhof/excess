defmodule Excess.SignalChannel do
  use Phoenix.Channel
  require Logger

  # Room joining

  def join("room:" <> room_id, %{"user_id" => user_id}, socket) do
    socket = assign(socket, :user_id, user_id)

    Logger.info "JOIN #{user_id} joined in room #{room_id}"

    # Create room (will only create it if it already exists)
    room = Excess.Registry.create(Excess.Registry, room_id)
    Excess.Room.put(room, user_id, socket)
    Excess.UserDict.put(Excess.UserDict, user_id, room_id)

    {:ok, socket}
  end

  def join("room:" <> room_id, message, socket) do
    Logger.warn "User attempted to join room #{room_id}"
    Logger.warn "However, message #{inspect message} lacked user_id"
    {:error, socket, :did_not_specify_user_id}
  end

  def handle_in("switch:room", %{"room_id" => room_id}, socket) do
    user_id = socket.assigns[:user_id]
    current_room_id = Excess.UserDict.get(Excess.UserDict, user_id)

    {:ok, current_room} = Excess.Registry.lookup(Excess.Registry, current_room_id)
    toRoom = Excess.Registry.create(Excess.Registry, room_id)

    Excess.Room.delete(current_room, user_id)
    Excess.Room.put(toRoom, user_id, socket)
    Excess.UserDict.put(Excess.UserDict, user_id, room_id)

    Logger.info "SWITCH #{user_id} switched from room #{current_room_id} to room #{room_id}"

    reply socket, "switch:room", %{message: ("You joined room " <> room_id)}
  end

  def handle_in("switch:room", message, socket) do
    Logger.warn "Invalid switch:room message received: #{(inspect message)}"
    reply socket, "switch:room:error", %{message: "Invalid message!"}
  end

  def handle_in(topic, message, socket) do
    Logger.warn "Unknown topic \"#{topic}\" received with message: #{(inspect message)}"
    reply socket, "unknown:topic", %{message: "Unknown topic: #{topic}!"}
  end


  def leave(_message, socket) do
    user_id = socket.assigns[:user_id]
    current_room_id = Excess.UserDict.get(Excess.UserDict, user_id)

    case Excess.Registry.lookup(Excess.Registry, current_room_id) do
      {:ok, current_room} ->
        Logger.info "LEAVE #{user_id}, in room #{current_room_id} left server"
        Excess.Room.delete(current_room, user_id)
      :error ->
        Logger.warn "LEAVE User didn't seem to be in room #{current_room_id}?!"
    end


    Excess.UserDict.delete(Excess.UserDict, user_id)

    {:ok, socket}
  end


end
