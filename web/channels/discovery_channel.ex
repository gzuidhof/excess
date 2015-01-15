defmodule Excess.DiscoveryChannel do
  use Phoenix.Channel
  require Logger

  def join("discovery", _message, socket) do
    {:ok, socket}
  end

  # Room lookup

  def handle_in("get:room", %{"id" => room_id, "r" => request}, socket) do
    users = Excess.Api.get_users(room_id)
    Logger.info "LOOKUP peers of \t #{room_id}"
    reply socket, "get:room", %{users: users, r: request}
  end

  def handle_in("get:room", message, socket) do
    Logger.warn "Invalid get:room message received: #{(inspect message)}"
    reply socket, "get:room:error", %{message: "Invalid message!"}
  end

  def handle_in(topic, message, socket) do
    Logger.warn "Unknown topic \"#{topic}\" received with message: #{(inspect message)}"
    reply socket, "unknown:topic", %{message: "Unknown topic: #{topic}!"}
  end

end
