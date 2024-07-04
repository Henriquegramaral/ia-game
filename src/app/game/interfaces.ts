'use client'

export interface Celula {
    wumpus: boolean;
    cheiro: boolean;
    brisa: boolean;
    poco: boolean;
    ouro: boolean;
    guerreiro: boolean;
}

export interface MundoWumpus {
    malha: Celula[][];
}
