# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
use Mix.Config

# Configures the endpoint
config :excess, Excess.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "mQHZBtiI+npWSuDaTsq2UR8yFC4EqvOBM4z1KwQFxkmdEHxWUGHDEGIWu6l31Fnk",
  debug_errors: false

# Configures Elixir's Logger
config :logger, :console,
  #format: "$time $metadata[$level] $message\n",
  format: "$time [$level] $message\n",
  metadata: [:request_id]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env}.exs"
