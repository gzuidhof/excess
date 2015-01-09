defmodule Excess.SignalChannel do
  use Phoenix.Channel

  def join("room:" <> room_id, %{"user_id:" => user_id}, socket) do
    socket = assign(socket, :user_id, user_id)
    {:ok, socket}
  end

  def join("room:" <> room_id, message, socket) do
    {:error, socket, :did_not_supply_id}
  end

  def incoming("join:room", %{"room_id:" => room_id}, socket) do
    reply socket, "join:room", %{message: ("You joined room " <> room_id)}
  end


  # user_id = get_assign(socket, :user_id)
end
