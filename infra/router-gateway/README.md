# Router gateway (spike)

Standalone VPS that terminates router tunnels and reads RouterOS status.
Not part of the web app build. See docs/03-product/router-connection-spike.md.

## Layout
- `setup-vps.sh` — installs WireGuard + SoftEther (SSTP) on Ubuntu 24.04 and a firewall.
- `routeros/v7-wireguard.rsc` — template paste command for RouterOS v7.
- `routeros/v6-sstp.rsc` — template paste command for RouterOS v6.

## Rules
- Placeholders in `{{...}}` are filled per router by Mikro; never commit real keys or passwords.
- RouterOS API port 8728 is reachable only inside the tunnel subnet 10.77.0.0/16.
