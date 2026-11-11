# Mikro — connect RouterOS v6 (read-only). Placeholders filled per router.
/interface sstp-client add name=mikro-sstp connect-to={{SERVER_IP}} user="{{TUNNEL_USER}}" password="{{TUNNEL_PASSWORD}}" profile=default-encryption disabled=no
/user group add name=mikro-read policy=read,api,!write,!policy,!sensitive
/user add name=mikro group=mikro-read password="{{API_PASSWORD}}" address=10.77.0.1/32
/ip service set api address=10.77.0.1/32 disabled=no
