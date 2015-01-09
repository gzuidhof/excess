defmodule Excess.RegistryTest do
  use ExUnit.Case, async: true

  setup do
    {:ok, supervisor} = Excess.Room.Supervisor.start_link
    {:ok, registry} = Excess.Registry.start_link(supervisor)
    {:ok, registry: registry}
  end

  test "spawns rooms", %{registry: registry} do
    assert Excess.Registry.lookup(registry, "someRoom") == :error

    Excess.Registry.create(registry, "someRoom")
    assert {:ok, room} = Excess.Registry.lookup(registry, "someRoom")

    Excess.Room.put(room, "someOtherRoom", 1)
  #  assert Excess.Room.get(room, "someOtherRoom") == 1
  end


  test "removes room on crash", %{registry: registry} do
    Excess.Registry.create(registry, "room")
    {:ok, room} = Excess.Registry.lookup(registry, "room")

    # Kill the bucket and wait for the notification
    Process.exit(room, :shutdown)
    :timer.sleep(20)
    assert Excess.Registry.lookup(registry, "room") == :error
  end

  test "removes room on empty", %{registry: registry} do
    Excess.Registry.create(registry, "room")
    {:ok, room} = Excess.Registry.lookup(registry, "room")

    Excess.Room.put(room, "hank", 1234)
    Excess.Room.delete(room, "hank")
    :timer.sleep(20)
    assert Excess.Registry.lookup(registry, "room") == :error
  end





end
