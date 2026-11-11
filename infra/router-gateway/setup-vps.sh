#!/usr/bin/env bash
# Mikro router gateway — first-time setup on Ubuntu 24.04. Run as root.
set -euo pipefail
apt-get update
apt-get install -y wireguard ufw curl
umask 077
[ -f /etc/wireguard/server.key ] || wg genkey | tee /etc/wireguard/server.key | wg pubkey > /etc/wireguard/server.pub
cat > /etc/wireguard/wg0.conf <<CONF
[Interface]
Address = 10.77.0.1/16
ListenPort = 51820
PrivateKey = $(cat /etc/wireguard/server.key)
# Router peers are appended per router by Mikro.
CONF
systemctl enable --now wg-quick@wg0
ufw default deny incoming
ufw allow 22/tcp
ufw allow 51820/udp
ufw allow 443/tcp   # SSTP for RouterOS v6 (SoftEther installed in the next phase)
ufw --force enable
echo "Server WireGuard public key (share this, never the private key):"
cat /etc/wireguard/server.pub
