#!/bin/bash

# ============================================
# PM2 Setup Script - Financial App
# ============================================
# Este script configura o PM2 para gerenciar
# o Frontend e Backend do Financial App
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         PM2 Setup - Financial App                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1. Verificar se PM2 está instalado
# ============================================
echo -e "${BLUE}[1/5]${NC} Verificando PM2..."

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 não encontrado. Instalando globalmente...${NC}"
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PM2 instalado com sucesso${NC}"
    else
        echo -e "${RED}✗ Erro ao instalar PM2${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ PM2 já está instalado${NC}"
    pm2 --version
fi

echo ""

# ============================================
# 2. Criar diretório de logs
# ============================================
echo -e "${BLUE}[2/5]${NC} Criando diretório de logs..."

if [ ! -d "./logs" ]; then
    mkdir -p ./logs
    echo -e "${GREEN}✓ Diretório ./logs criado${NC}"
else
    echo -e "${GREEN}✓ Diretório ./logs já existe${NC}"
fi

echo ""

# ============================================
# 3. Instalar dependências
# ============================================
echo -e "${BLUE}[3/5]${NC} Instalando dependências..."

echo "  → Frontend..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Frontend OK${NC}"
else
    echo -e "${RED}  ✗ Erro no Frontend${NC}"
    exit 1
fi

echo "  → Backend..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Backend OK${NC}"
else
    echo -e "${RED}  ✗ Erro no Backend${NC}"
    exit 1
fi
cd ..

echo ""

# ============================================
# 4. Parar processos antigos
# ============================================
echo -e "${BLUE}[4/5]${NC} Parando processos antigos..."

pm2 delete ecosystem.config.js 2>/dev/null
echo -e "${GREEN}✓ Processos antigos removidos${NC}"

echo ""

# ============================================
# 5. Iniciar com PM2
# ============================================
echo -e "${BLUE}[5/5]${NC} Iniciando com PM2..."

pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Processos iniciados com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao iniciar processos${NC}"
    exit 1
fi

echo ""

# ============================================
# Salvar configuração
# ============================================
echo -e "${BLUE}Salvando configuração do PM2...${NC}"
pm2 save
pm2 startup

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✓ SETUP COMPLETO!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Seu projeto está rodando com PM2!${NC}"
echo ""
echo "📊 Status dos processos:"
pm2 status
echo ""
echo "🌐 Acessar:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3000"
echo ""
echo "📚 Comandos úteis:"
echo "   pm2 status              → Ver status dos processos"
echo "   pm2 logs                → Ver logs em tempo real"
echo "   pm2 logs financial-app-frontend  → Logs do frontend"
echo "   pm2 logs financial-app-backend   → Logs do backend"
echo "   pm2 restart all         → Reiniciar todos"
echo "   pm2 stop all            → Parar todos"
echo "   pm2 delete all          → Deletar todos"
echo "   pm2 monit               → Monitor em tempo real"
echo ""
