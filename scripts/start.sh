#!/bin/bash

# Script para iniciar o projeto Financial App com ambas as partes

echo ""
echo "========================================"
echo "  Financial App - Setup Completo"
echo "========================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado!"
    echo "Baixe em: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detectado: $(node --version)"
echo ""

# Menu de opções
echo "Escolha como deseja rodar o projeto:"
echo ""
echo "1) Rodar APENAS o Frontend (API Groq Direta)"
echo "2) Rodar Frontend + Backend (Proxy)"
echo "3) Rodar APENAS o Backend"
echo ""

read -p "Digite sua escolha (1, 2 ou 3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Iniciando Frontend com API Groq Direta..."
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "🚀 Iniciando Frontend + Backend..."
        echo ""
        
        # Abrir backend em novo terminal (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a Terminal "$(pwd)/backend"
            cd backend && npm install && npm run dev &
        else
            # Linux
            gnome-terminal -- bash -c "cd backend && npm install && npm run dev" &
        fi
        
        # Aguardar um pouco para o backend iniciar
        sleep 3
        
        # Iniciar frontend
        npm run dev
        ;;
    3)
        echo ""
        echo "🚀 Iniciando Backend..."
        echo ""
        cd backend
        npm install
        npm run dev
        ;;
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac
