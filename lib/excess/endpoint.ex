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
    signing_salt: "e878ix56",
    encryption_salt: "OlLK3aPE"

  plug :router, Excess.Router
end
