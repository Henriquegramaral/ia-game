'use client'

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Card, Grid, Box, Button, Typography, Snackbar } from "@mui/material";
import { MundoWumpus } from './interfaces';
import Image from 'next/image';


const Game: React.FC = () => {
    const [mundo, setMundo] = useState<MundoWumpus | null>(null);
    const [agentPos, setAgentPos] = useState<number>(0);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [hasGold, setHasGold] = useState<boolean>(false);
    const [visitedPositions, setVisitedPositions] = useState<Set<number>>(new Set());
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const moveAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (mundo && !gameOver && gameStarted) {
            intervalRef.current = setInterval(() => {
                moveAgent();
            }, 700);
        }

        // Limpa o intervalo quando o componente é desmontado ou o jogo termina.
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [mundo, gameOver, gameStarted]);

    const fetchMundo = () => {
        axios.get<MundoWumpus>('http://127.0.0.1:8000/mundo-wumpus')
            .then(response => {
                // Inicializa o estado com os dados do mundo.
                setMundo(response.data);
                setAgentPos(0);
                setGameOver(false);
                setMessage('');
                setHasGold(false);
                setVisitedPositions(new Set());

                // Marca a posição inicial do guerreiro no mundo.
                const newMundo = response.data;
                newMundo.malha[0][0].guerreiro = true;
                setMundo(newMundo);
            })
            .catch(error => {
                console.error('Erro ao buscar o mundo do Wumpus:', error);
            });
    };

    // Função para mover o agente.
    const moveAgent = () => {
        if (!mundo) return;

        if (moveAudioRef.current) {
            moveAudioRef.current.play().catch(error => {
                console.error('Erro ao reproduzir o som de movimento:', error);
            });
        }

        // Clona o estado atual do mundo.
        const newMundo = JSON.parse(JSON.stringify(mundo)) as MundoWumpus;
        const currentPos = agentPos;
        const neighbors = getNeighbors(currentPos);

        // Filtra os vizinhos seguros (sem poços ou Wumpus).
        const safeNeighbors = neighbors.filter(pos => !newMundo.malha[Math.floor(pos / 4)][pos % 4].poco && !newMundo.malha[Math.floor(pos / 4)][pos % 4].wumpus);

        // Se não houver vizinhos seguros, o jogo termina com uma mensagem de derrota.
        if (safeNeighbors.length === 0) {
            setMessage('O guerreiro morreu!');
            setGameOver(true);
            return;
        }

        // Seleciona aleatoriamente um próximo movimento seguro.
        const nextPos = safeNeighbors[Math.floor(Math.random() * safeNeighbors.length)];
        const currentRow = Math.floor(currentPos / 4);
        const currentCol = currentPos % 4;
        newMundo.malha[currentRow][currentCol].guerreiro = false;

        const nextRow = Math.floor(nextPos / 4);
        const nextCol = nextPos % 4;
        newMundo.malha[nextRow][nextCol].guerreiro = true;

        // Atualiza as posições visitadas e o estado do mundo.
        setVisitedPositions(prev => new Set(prev).add(currentPos));
        setMundo(newMundo);
        setAgentPos(nextPos);

        // Verifica se o agente encontrou ouro.
        if (newMundo.malha[nextRow][nextCol].ouro) {
            setHasGold(true);
            newMundo.malha[nextRow][nextCol].ouro = false;
            setSnackbarOpen(true);
        }

        // Verifica se o agente sente o cheiro do Wumpus.
        if (newMundo.malha[nextRow][nextCol].cheiro) {
            const wumpusPos = getNeighbors(nextPos).find(pos => newMundo.malha[Math.floor(pos / 4)][pos % 4].wumpus);
            if (wumpusPos !== undefined) {
                newMundo.malha[Math.floor(wumpusPos / 4)][wumpusPos % 4].wumpus = false;
                newMundo.malha[nextRow][nextCol].cheiro = false;
                setMessage('Você matou o Wumpus! Você venceu!');
                setGameOver(true);
                return;
            }
        }
    };

    // Obtem os vizinhos de uma posição no grid.
    const getNeighbors = (index: number): number[] => {
        const neighbors = [];
        if (index % 4 !== 0) neighbors.push(index - 1);
        if (index % 4 !== 3) neighbors.push(index + 1);
        if (index - 4 >= 0) neighbors.push(index - 4);
        if (index + 4 < 16) neighbors.push(index + 4);
        return neighbors;
    };

    const startGame = () => {
        fetchMundo();
        setGameStarted(true);
        if (audioRef.current) {
            audioRef.current.play().catch(error => {
                console.error('Erro ao reproduzir a música:', error);
            });
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 50px)', display: 'flex', flexDirection: 'column', backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
            <audio ref={audioRef} src="/assets/background-music.mp3" loop>
                <track kind="captions" srcLang="en" label="english_captions" />
            </audio>
            <audio ref={moveAudioRef} src="/assets/move-sound.mp3" />
            {!gameStarted ? (
                <Box sx={{ textAlign: 'center' }}>
                    <Button variant="contained" onClick={startGame} sx={{ mt: 2 }}>Iniciar Jogo</Button>
                </Box>
            ) : (
                <Grid container spacing={2} sx={{ flex: 1 }}>
                    {mundo ? (
                        mundo.malha.flat().map((celula, index) => (
                            <Grid item xl={3} lg={3} md={3} sm={3} xs={3} key={index}>
                                <Card sx={{ backgroundColor: celula.guerreiro ? 'lightyellow' : visitedPositions.has(index) ? 'burlywood' : 'blue', width: '100%', height: '100%', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                                    {celula.wumpus && (
                                        <Box sx={{ width: '50%', height: '50%', position: 'relative' }}>
                                            <Image src={'/assets/wumpus.png'} alt="Wumpus" layout="fill" objectFit="contain" />
                                        </Box>
                                    )}
                                    {celula.cheiro && (
                                        <Box sx={{ width: '50%', height: '50%', position: 'relative' }}>
                                            <Image src={'/assets/cheiro.png'} alt="Cheiro" layout="fill" objectFit="contain" />
                                        </Box>
                                    )}
                                    {celula.brisa && (
                                        <Box sx={{ width: '50%', height: '50%', position: 'relative' }}>
                                            <Image src={'/assets/brisa.png'} alt="Brisa" layout="fill" objectFit="contain" />
                                        </Box>
                                    )}
                                    {celula.poco && (
                                        <Box sx={{ width: '50%', height: '50%', position: 'relative' }}>
                                            <Image src={'/assets/poco.png'} alt="Poço" layout="fill" objectFit="contain" />
                                        </Box>
                                    )}
                                    {celula.ouro && (
                                        <Box sx={{ width: '50%', height: '50%', position: 'relative' }}>
                                            <Image src={'/assets/ouro.png'} alt="Ouro" layout="fill" objectFit="contain" />
                                        </Box>
                                    )}
                                    {celula.guerreiro && (
                                        <Box sx={{ width: '50%', height: '50%', position: 'relative' }}>
                                            <Image src={'/assets/guerreiro.png'} alt="Guerreiro" layout="fill" objectFit="contain" />
                                        </Box>
                                    )}
                                </Card>
                            </Grid>
                        ))
                    ) : (
                        [...Array(16)].map((_, index) => (
                            <Grid item xl={3} lg={3} md={3} sm={3} xs={3} key={index}>
                                <Card sx={{ backgroundColor: 'blue', width: '100%', height: '100%' }}>
                                </Card>
                            </Grid>
                        ))
                    )}
                </Grid>
            )}
            {gameOver && (
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ color: 'white' }}>{message}</Typography>
                    <Button variant="contained" onClick={startGame} sx={{ mt: 2 }}>Jogar Novamente</Button>
                </Box>
            )}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message="+1000"
            />
        </Box>
    );
};

export default Game;