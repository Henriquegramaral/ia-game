from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import random

app = FastAPI()

# Definição da classe Celula para representar cada célula do mundo
class Celula(BaseModel):
    wumpus: bool
    cheiro: bool
    brisa: bool
    poco: bool
    ouro: bool
    guerreiro: bool

# Definição da classe MundoWumpus para representar o mundo do jogo
class MundoWumpus(BaseModel):
    malha: List[List[Celula]]

QUAD = 16  # Número total de células no mundo (4x4)
WCOL = 4   # Número de colunas no mundo
noinf = -1

# Função para inicializar as células do mundo
def iniQuad():
    return [{'wumpus': False, 'cheiro': False, 'brisa': False, 'poco': False, 'ouro': False, 'guerreiro': False} for _ in range(QUAD)]

# Função para verificar se uma posição está na lista de exclusão
def excluded(lst, key):
    return key in lst

# Função para obter os vizinhos de uma célula dada sua posição
def get_neighbors(index):
    neighbors = []
    if index % WCOL != 0:  # Vizinho à esquerda
        neighbors.append(index - 1)
    if index % WCOL != WCOL - 1:  # Vizinho à direita
        neighbors.append(index + 1)
    if index - WCOL >= 0:  # Vizinho acima
        neighbors.append(index - WCOL)
    if index + WCOL < QUAD:  # Vizinho abaixo
        neighbors.append(index + WCOL)
    return neighbors

# Função para gerar o mundo com as posições dos elementos
def genWorld(world, wquad):
    exclude = [0, 1, WCOL, WCOL + 1]  # Excluir as posições iniciais do guerreiro

    # Colocar o Wumpus em uma posição aleatória
    qty = 0
    while qty != 1:
        ghost = random.randint(0, QUAD - 1)
        if not excluded(exclude, ghost):
            wquad[ghost]['wumpus'] = True
            for neighbor in get_neighbors(ghost):
                wquad[neighbor]['cheiro'] = True
            qty += 1

    # Colocar poços com probabilidade de 20%
    for i in range(QUAD):
        if not excluded(exclude, i) and random.random() < 0.2:
            wquad[i]['poco'] = True
            for neighbor in get_neighbors(i):
                wquad[neighbor]['brisa'] = True
            exclude.append(i)

    # Colocar o ouro em uma posição aleatória
    qty = 0
    while qty != 1:
        gold = random.randint(0, QUAD - 1)
        if not excluded(exclude, gold):
            wquad[gold]['ouro'] = True
            qty += 1

# Endpoint para obter o mundo do Wumpus
@app.get("/mundo-wumpus", response_model=MundoWumpus)
def get_mundo():
    world = [[0 for _ in range(WCOL)] for _ in range(WCOL)]  # Inicializa a matriz do mundo
    wquad = iniQuad()  # Inicializa as células do mundo
    genWorld(world, wquad)  # Gera o mundo com os elementos
    
    # Converte a lista de dicionários para uma matriz de objetos Celula
    malha = [[Celula(**wquad[j + i * WCOL]) for j in range(WCOL)] for i in range(WCOL)]
    
    return MundoWumpus(malha=malha)  # Retorna o mundo do Wumpus

# Código para executar a aplicação FastAPI
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)