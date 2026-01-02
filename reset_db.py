"""
Script para migrar o banco de dados PostgreSQL e adicionar a coluna 'banco'
"""
from main import engine, SessionLocal, Transacao
from sqlalchemy import text

db = SessionLocal()

try:
    # Tenta adicionar a coluna banco se ela não existir
    print("🔄 Verificando estrutura do banco...")
    
    with engine.connect() as conn:
        # Adiciona a coluna banco se não existir
        try:
            conn.execute(text("""
                ALTER TABLE transacoes 
                ADD COLUMN IF NOT EXISTS banco VARCHAR;
            """))
            conn.commit()
            print("✅ Coluna 'banco' adicionada/verificada")
        except Exception as e:
            print(f"⚠️  Erro ao adicionar coluna: {e}")
        
        # Atualiza transações existentes sem banco para ter um banco padrão
        try:
            result = conn.execute(text("""
                UPDATE transacoes 
                SET banco = 'xp1' 
                WHERE banco IS NULL OR banco = '';
            """))
            conn.commit()
            print(f"✅ {result.rowcount} transações antigas atualizadas com banco padrão 'xp1'")
        except Exception as e:
            print(f"⚠️  Erro ao atualizar transações: {e}")
    
    # Verifica o total de transações
    total = db.query(Transacao).count()
    print(f"\n📊 Total de transações no banco: {total}")
    
    # Mostra resumo por banco
    print("\n📊 Resumo por banco:")
    for banco in ["xp1", "xp2", "inter", "mercadopago"]:
        transacoes_banco = db.query(Transacao).filter(Transacao.banco == banco).all()
        if transacoes_banco:
            entradas = sum(t.valor for t in transacoes_banco if t.tipo == "entrada")
            saidas = sum(t.valor for t in transacoes_banco if t.tipo == "saida")
            saldo = entradas - saidas
            
            nome_banco = {
                "xp1": "XP1 Pessoal",
                "xp2": "XP2 Compartilhado",
                "inter": "Inter",
                "mercadopago": "Mercado Pago"
            }[banco]
            
            print(f"  {nome_banco}: R$ {saldo:,.2f} ({len(transacoes_banco)} transações)")
    
    print("\n✅ Migração concluída com sucesso!")
    
except Exception as e:
    print(f"❌ Erro durante a migração: {e}")
finally:
    db.close()

