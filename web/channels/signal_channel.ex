defmodule Excess.SignalChannel do
  use Phoenix.Channel
  require Logger

  def join("room:" <> room_id, %{"user_id" => user_id}, socket) do
    socket = assign(socket, :user_id, user_id)

    Logger.info "User #{user_id} joined room #{room_id}!"

    #a = Excess.Registry.lookup(Excess.Registry, "room")
    {:ok, socket}
  end

  def join("room:" <> room_id, message, socket) do

    Logger.warn "User attempted to join room #{room_id}"
    Logger.warn "However, message #{inspect message} lacked user_id"

    {:error, socket, :did_not_supply_id}
  end

  def incoming("join:room", %{"room_id:" => room_id}, socket) do
    reply socket, "join:room", %{message: ("You joined room " <> room_id)}
  end


  # user_id = get_assign(socket, :user_id)
end
