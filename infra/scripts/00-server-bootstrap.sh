#!/usr/bin/env bash
# =============================================================================
# 00-server-bootstrap.sh
# Cài đặt base cho server vật lý văn phòng (Ubuntu 22.04 fresh)
# Chạy 1 lần với quyền root: sudo bash 00-server-bootstrap.sh
# =============================================================================
set -euo pipefail

echo "==> [1/8] Update + base packages"
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl wget git vim htop ufw fail2ban unzip jq ca-certificates \
  gnupg lsb-release net-tools dnsutils rsync restic

echo "==> [2/8] Timezone + locale"
timedatectl set-timezone Asia/Ho_Chi_Minh
locale-gen en_US.UTF-8 vi_VN.UTF-8

echo "==> [3/8] Swap 8GB (server cũ RAM có thể không đủ)"
if [ ! -f /swapfile ]; then
  fallocate -l 8G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> [4/8] Docker Engine + Compose v2"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "==> [5/8] Firewall (UFW): SSH + HTTPS only"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (redirect)'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo "==> [6/8] Fail2ban — chặn brute-force SSH"
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
port = 22
maxretry = 5
bantime = 1h
findtime = 10m
EOF
systemctl enable --now fail2ban

echo "==> [7/8] Nginx + Certbot"
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx

echo "==> [8/8] Mount points cho NVMe (chỉ tạo folder, mount /etc/fstab tự config theo disk)"
mkdir -p /mnt/db-data/postgres /mnt/db-data/wal-archive /mnt/storage-data /mnt/backups
chown -R 999:999 /mnt/db-data       # postgres uid trong container
chown -R 1000:1000 /mnt/storage-data # supabase storage uid

cat <<'NEXT'

✅ Bootstrap xong. Tiếp theo:

1. Mount NVMe vào /mnt/db-data và /mnt/storage-data (tự edit /etc/fstab)
2. Copy public SSH key admin vào ~/.ssh/authorized_keys, disable password auth
3. Trỏ DNS api.flowa.one + studio.flowa.one → IP server
4. Chạy: bash 01-install-supabase.sh
5. Sau khi Supabase chạy: certbot --nginx -d api.flowa.one -d studio.flowa.one

NEXT
