// Importado primeiro no main.tsx: precisa rodar antes de o client do Supabase
// ser criado (ele guarda a referência do fetch na criação).
import { installRequestDedupe } from './requestDedupe';

installRequestDedupe();
