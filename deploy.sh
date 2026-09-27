#!/bin/bash
set -e

echo "========================================================"
echo " OceanTwin Automated 24/7 Cloud Deployment Script"
echo " Smart India Hackathon 2026 - Problem Statement: SIH 26067"
echo "========================================================"

# 1. Enable 2GB Swap Memory (prevents OOM on AWS t2.micro / t3.micro)
if [ ! -f /swapfile ]; then
    echo "--> Configuring 2GB Swap Memory..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "--> Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER || true
fi

# 3. Stop old container if running
echo "--> Cleaning up previous containers..."
sudo docker stop oceantwin-app 2>/dev/null || true
sudo docker rm oceantwin-app 2>/dev/null || true

# 4. Build fresh Docker image
echo "--> Building production container (React + Three.js + FastAPI)..."
sudo docker build -t oceantwin .

# 5. Launch container on port 80 with auto-restart
echo "--> Starting OceanTwin on Port 80 (Auto-Restart Enabled)..."
sudo docker run -d \
    --name oceantwin-app \
    --restart always \
    -p 80:8080 \
    oceantwin

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || echo "YOUR-SERVER-IP")

echo "========================================================"
echo "  OceanTwin is LIVE and running 24/7!"
echo "  Web Application: http://${PUBLIC_IP}"
echo "  API Documentation: http://${PUBLIC_IP}/docs"
echo "========================================================"
