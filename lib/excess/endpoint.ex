defmodule Excess.Endpoint do
  use Phoenix.Endpoint, otp_app: :excess

  plug Plug.Static,
    at: "/", from: :excess

  plug Plug.Logger

  # Code reloading will only work if the :code_reloader key of
  # the :phoenix application is set to true in your config file.
  plug Phoenix.CodeReloader

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Poison

  plug Plug.MethodOverride
  plug Plug.Head

  plug Plug.Session,
    store: :cookie,
    key: "_excess_key",
    signing_salt: "TchvC2TP",
    encryption_salt: "35H4RmJb"

  plug :router, Excess.Router
end
