use Mix.Config

config :excess, Excess.Endpoint,
  http: [port: System.get_env("PORT") || 4001]
