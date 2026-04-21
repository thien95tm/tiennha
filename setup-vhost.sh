#!/bin/bash
# Setup virtual host tienthuenha.local
# Chạy: sudo bash /var/www/html/tienthuenha/setup-vhost.sh

set -e

VHOST_FILE=/etc/apache2/sites-available/tienthuenha.local.conf

cat > "$VHOST_FILE" <<'EOF'
<VirtualHost *:80>
    ServerAdmin admin@tienthuenha.local
    ServerName tienthuenha.local
    ServerAlias www.tienthuenha.local
    DocumentRoot /var/www/html/tienthuenha

    <Directory /var/www/html/tienthuenha>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/html/tienthuenha/api>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/tienthuenha-error.log
    CustomLog ${APACHE_LOG_DIR}/tienthuenha-access.log combined
</VirtualHost>
EOF
echo "✓ Tạo $VHOST_FILE"

a2ensite tienthuenha.local.conf
a2enmod rewrite 2>/dev/null

if ! grep -q "tienthuenha.local" /etc/hosts; then
    echo "127.0.0.1 tienthuenha.local www.tienthuenha.local" >> /etc/hosts
    echo "✓ Thêm tienthuenha.local vào /etc/hosts"
else
    echo "✓ /etc/hosts đã có tienthuenha.local"
fi

apache2ctl configtest
systemctl reload apache2
echo ""
echo "✓ HOÀN TẤT - thử mở: http://tienthuenha.local/api/"
