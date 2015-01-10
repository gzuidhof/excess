defmodule Excess.RoomTest do
  use ExUnit.Case, async: true

  setup do
    {:ok, room} = Excess.Room.start_link
    {:ok, room: room}
  end



  test "stores users by id", %{room: room} do
    assert Excess.Room.get(room, "fred") == nil

    Excess.Room.put(room, "fred", 1234)
    assert Excess.Room.get(room, "fred") == 1234
  end

  test "stops room when empty", %{room: room} do
    assert Excess.Room.get(room, "fred") == nil
    Excess.Room.put(room, "fred", 1234)
    Excess.Room.delete(room, "fred")

    assert Process.alive?(room) == false
  end


  test "removes users by id", %{room: room} do
    assert Excess.Room.get(room, "fred") == nil

    Excess.Room.put(room, "hank", 1234)
    Excess.Room.put(room, "fred", 1234)
    Excess.Room.delete(room, "fred")

    assert Excess.Room.get(room, "fred") == nil

  end




end
