import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field, validator
import uvicorn
from datetime import date

# --- CONFIGURAÇÃO DO BANCO DE DADOS ---
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./financas.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELO SQLALCHEMY ---
class Transacao(Base):
    __tablename__ = "transacoes"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    tipo = Column(String, nullable=False)  # 'entrada' ou 'saida'
    data = Column(Date, nullable=False)
    categoria = Column(String, nullable=False)

# --- SCHEMAS PYDANTIC ---
class TransacaoBase(BaseModel):
    titulo: str = Field(..., example="Salário")
    valor: float = Field(..., example=1500.00)
    tipo: str = Field(..., example="entrada")
    data: date = Field(..., example="2026-01-02")
    categoria: str = Field(..., example="Renda Fixa")

    @validator("tipo")
    def tipo_must_be_entrada_ou_saida(cls, v):
        if v not in ("entrada", "saida"):
            raise ValueError("O campo 'tipo' deve ser 'entrada' ou 'saida'.")
        return v



class TransacaoCreate(TransacaoBase):
    pass

class TransacaoUpdate(TransacaoBase):
    pass

class TransacaoResponse(TransacaoBase):
    id: int
    class Config:
        orm_mode = True

class ResumoResponse(BaseModel):
    total_entradas: float
    total_saidas: float
    saldo: float

# --- DEPENDÊNCIA DE SESSÃO ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- INICIALIZAÇÃO FASTAPI ---
app = FastAPI(title="Gestor Financeiro Pessoal", version="1.0.0")

# --- CONFIGURAÇÃO DO CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CRIAÇÃO DAS TABELAS ---
Base.metadata.create_all(bind=engine)

# --- ROTAS ---
@app.get("/")
def health_check():
    return {"status": "API do Gestor Financeiro rodando!"}

@app.get("/transacoes", response_model=List[TransacaoResponse])
def listar_transacoes(db: Session = Depends(get_db)):
    return db.query(Transacao).order_by(Transacao.data.desc(), Transacao.id.desc()).all()

@app.post("/transacoes", response_model=TransacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_transacao(transacao: TransacaoCreate, db: Session = Depends(get_db)):
    db_transacao = Transacao(**transacao.dict())
    db.add(db_transacao)
    db.commit()
    db.refresh(db_transacao)
    return db_transacao


@app.put("/transacoes/{id}", response_model=TransacaoResponse)
def atualizar_transacao(id: int, transacao: TransacaoUpdate, db: Session = Depends(get_db)):
    db_transacao = db.query(Transacao).filter(Transacao.id == id).first()
    if not db_transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    for key, value in transacao.dict().items():
        setattr(db_transacao, key, value)
    db.commit()
    db.refresh(db_transacao)
    return db_transacao

@app.delete("/transacoes/{id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_transacao(id: int, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(Transacao.id == id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    db.delete(transacao)
    db.commit()
    return

@app.get("/transacoes/resumo", response_model=ResumoResponse)
def resumo_transacoes(db: Session = Depends(get_db)):
    entradas = db.query(Transacao).filter(Transacao.tipo == "entrada").all()
    saídas = db.query(Transacao).filter(Transacao.tipo == "saida").all()
    total_entradas = sum(t.valor for t in entradas)
    total_saidas = sum(t.valor for t in saídas)
    saldo = total_entradas - total_saidas
    return ResumoResponse(total_entradas=total_entradas, total_saidas=total_saidas, saldo=saldo)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
