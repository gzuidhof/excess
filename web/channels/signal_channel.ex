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

  def handle_in("switch:room", %{"room_id" => room_id}, socket) do
    user_id = socket.assigns[:user_id]

    {:ok, previous_room_id} = Excess.Api.switch_room(user_id. room_id, socket)
    Logger.info "SWITCH #{user_id} switched from room " <>
      "#{previous_room_id} to room #{room_id}"

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
    {:ok, room_id} = Excess.Api.leave(user_id)
    Logger.info "LEAVE #{user_id} left server, was in room #{room_id}"
    {:ok, socket}
  end


end
