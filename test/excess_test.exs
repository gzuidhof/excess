defmodule ExcessTest do
  use ExUnit.Case, async: true

  test "Adds user to room on join" do
    Excess.Api.join_room("userid", "roomid", "SOCKET")

    {:ok, room} = Excess.Registry.lookup(Excess.Registry, "roomid")

    socket = Excess.Room.get(room, "userid")
    assert socket == "SOCKET"
  end

  test "Switches user to other room" do
    # Have to add two users, otherwise room would get cleaned up
    # Which is not what is tested here
    Excess.Api.join_room("jack", "room_one", "SOCKET1")
    Excess.Api.join_room("john", "room_one", "SOCKET2")

    Excess.Api.switch_room("jack", "room_two", "SOCKET1")

    {:ok, room_one} = Excess.Registry.lookup(Excess.Registry, "room_one")
    {:ok, room_two} = Excess.Registry.lookup(Excess.Registry, "room_two")

    assert Excess.Room.get(room_one, "jack") == nil
    assert Excess.Room.get(room_one, "john") == "SOCKET2"
    assert Excess.Room.get(room_two, "jack") == "SOCKET1"
  end

  test "Look up users of empty (non-existent) room" do
    users = Excess.Api.get_users("room1")
    assert users == []
  end

  test "Look up users of non-empty room" do
    Excess.Api.join_room("fred", "room2", "SOCKET")

    users = Excess.Api.get_users("room2")
    assert users == ["fred"]
  end



end
