defmodule Excess.SignalChannel do
  use Phoenix.Channel
  require Logger

  # Room joining

  def join("room:" <> room_id, %{"user_id" => user_id}, socket) do
    socket = assign(socket, :user_id, user_id)
    Excess.Api.join_room(user_id, room_id, socket)
    Logger.info "JOIN #{user_id} joined in room #{room_id}"
    {:ok, socket}
  end

  def join("room:" <> room_id, message, socket) do
    Logger.warn "User attempted to join room #{room_id}"
    Logger.warn "However, message #{inspect message} lacked user_id"
    {:error, socket, :did_not_specify_user_id}
  end

  # Room lookup

  def handle_in("get:room", %{"room_id" => room_id}, socket) do
    users = Excess.Api.get_users(room_id)
    Logger.info "LOOKUP user list of #{room_id}"
    reply socket, "get:room", %{users: users}
  end

  def handle_in("get:room", message, socket) do
    Logger.warn "Invalid get:room message received: #{(inspect message)}"
    reply socket, "get:room:error", %{message: "Invalid message!"}
  end


  def handle_in("msg:user", %{"to"=> to_id, "msg"=> msg, "room"=> room}, socket) do

    from = socket.assigns[:user_id]

    case Excess.Api.get_user(to_id, room) do
      toSocket ->
          reply toSocket, "msg:user", %{from: from, msg: msg}
          reply socket, "msg:user", %{ok: true}
      :error ->
        Logger.warn "To user not found #{(inspect to_id)}"
        reply socket, "msg:user:notfound", %{message: "To user not found!"}
    end

  end

  def handle_in("msg:user", message, socket) do
    Logger.warn "Invalid msg:user message received: #{(inspect message)}"
    reply socket, "msg:user:error",
      %{message: "Invalid message, need \"to\", \"msg\" and \"room\" fields!"}
  end


  # Invalid topic

  def handle_in(topic, message, socket) do
    Logger.warn "Unknown topic \"#{topic}\" received with message: #{(inspect message)}"
    reply socket, "unknown:topic", %{message: "Unknown topic: #{topic}!"}
  end

  # Leaving

  def leave(_message, socket) do
    user_id = socket.assigns[:user_id]
    {:ok, room_id} = Excess.Api.leave(user_id)
    Logger.info "LEAVE #{user_id} left server, was in room #{room_id}"
    {:ok, socket}
  end


end
