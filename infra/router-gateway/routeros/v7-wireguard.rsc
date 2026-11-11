# Mikro — connect RouterOS v7 (read-only). Placeholders filled per router.
/interface wireguard add name=mikro-wg listen-port=13231 private-key="{{ROUTER_PRIVATE_KEY}}"
/interface wireguard peers add interface=mikro-wg public-key="{{SERVER_PUBLIC_KEY}}" endpoint-address={{SERVER_IP}} endpoint-port=51820 allowed-address=10.77.0.1/32 persistent-keepalive=25s
/ip address add address={{ROUTER_TUNNEL_IP}}/16 interface=mikro-wg
/user group add name=mikro-read policy=read,api,!write,!policy,!sensitive
/user add name=mikro group=mikro-read password="{{API_PASSWORD}}" address=10.77.0.1/32
/ip service set api address=10.77.0.1/32 disabled=no
