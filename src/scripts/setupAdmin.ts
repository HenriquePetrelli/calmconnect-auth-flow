// Script para executar a criação da conta admin
// Para executar: execute esta função via console do navegador

import { createDefaultAdminAccount } from '../utils/adminSetup';

export const executeAdminSetup = async () => {
  try {
    console.log('🔧 Iniciando configuração da conta administrativa...');
    
    const credentials = await createDefaultAdminAccount();
    
    console.log('✅ Conta administrativa criada com sucesso!');
    console.log('📧 Email:', credentials.email);
    console.log('🔑 Senha:', credentials.password);
    console.log('👤 Nome:', credentials.fullName);
    console.log('🆔 User ID:', credentials.userId);
    
    console.log('\n🚨 IMPORTANTE: Salve essas credenciais em local seguro!');
    console.log('🔗 Acesso: /admin-login');
    
    // Return credentials for copy/paste
    return {
      email: credentials.email,
      password: credentials.password,
      loginUrl: `${window.location.origin}/admin-login`,
      message: 'Conta criada com sucesso! Use as credenciais acima para fazer login.'
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar conta administrativa:', error);
    throw error;
  }
};

// Auto-execute if in development
if (import.meta.env.DEV) {
  console.log('🔧 Script de configuração admin carregado.');
  console.log('Execute executeAdminSetup() no console para criar a conta admin.');
}