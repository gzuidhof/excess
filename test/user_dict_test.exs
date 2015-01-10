defmodule Excess.UserDictTest do
  use ExUnit.Case, async: true

  setup do
    {:ok, dict} = Excess.UserDict.start_link
    {:ok, dict: dict}
  end



  test "maps users to room by id", %{dict: dict} do
    assert Excess.UserDict.get(dict, "fred") == nil

    Excess.UserDict.put(dict, "fred", "room")
    assert Excess.UserDict.get(dict, "fred") == "room"
  end

  test "removes users by id", %{dict: dict} do
    assert Excess.UserDict.get(dict, "fred") == nil

    Excess.UserDict.put(dict, "fred", "room")
    Excess.UserDict.delete(dict, "fred")
    assert Excess.UserDict.get(dict, "fred") == nil
  end




end
