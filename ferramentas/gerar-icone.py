# Gera ferramentas/fluxo.ico (atalho do Windows) e ferramentas/fluxo-256.png a partir das formas da logo.
# As formas e as cores são as mesmas de app/src/components/Logo.tsx. Uso: python ferramentas/gerar-icone.py
import os

import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
S = 1024  # desenha grande e reduz, para as bordas ficarem lisas
VB_X, VB_Y, VB_T = -15.5, -2, 104  # mesmo viewBox quadrado do componente
MARGEM = 0.14  # respiro entre a logo e a borda do quadrado escuro

FORMAS = {
    'lateral': '0,14.85 24.31,0 24.31,100 0,84.72',
    'topo': '24.31,0 63.61,0 73.07,25.47 24.31,25.47',
    'dobraTopo': '24.31,0.6 24.31,25.47 38.1,25.47',
    'meio': '0,53.71 23.29,38.72 56.33,38.72 56.33,64.05 15.87,64.05 0,73.8',
    'sombraMeio': '0,73.8 15.87,64.05 24.31,64.05 24.31,100 0,84.72',
}


def pt(x, y):
    esc = S * (1 - 2 * MARGEM) / VB_T
    return (S * MARGEM + (x - VB_X) * esc, S * MARGEM + (y - VB_Y) * esc)


def hexa(c, a=255):
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


def degrade(x1, y1, x2, y2, paradas):
    xs, ys = np.meshgrid(np.arange(S), np.arange(S))
    (ax, ay), (bx, by) = pt(x1, y1), pt(x2, y2)
    dx, dy = bx - ax, by - ay
    t = np.clip(((xs - ax) * dx + (ys - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    offs = [o for o, _ in paradas]
    cores = np.array([c for _, c in paradas], float)
    out = np.zeros((S, S, 4))
    for ch in range(4):
        out[..., ch] = np.interp(t, offs, cores[:, ch])
    return out


def mascara(pontos):
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).polygon([pt(*map(float, p.split(','))) for p in pontos.split()], fill=255)
    return np.array(m, float) / 255


def camada(img, cor, pontos):
    arr = cor.copy()
    arr[..., 3] *= mascara(pontos)
    return Image.alpha_composite(img, Image.fromarray(arr.astype(np.uint8), 'RGBA'))


def solido(c, a=255):
    out = np.zeros((S, S, 4))
    out[...] = hexa(c, a)
    return out


fundo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(fundo).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=hexa('#06110d'))
img = fundo
img = camada(img, degrade(0, 8, 26, 44, [(0, hexa('#36f6d8')), (1, hexa('#07a586'))]), FORMAS['lateral'])
img = camada(img, degrade(0, 64, 0, 96, [(0, hexa('#02130e', 140)), (1, hexa('#02130e', 0))]), FORMAS['sombraMeio'])
img = camada(img, degrade(24, 10, 73, 14, [(0, hexa('#0aa486')), (.45, hexa('#14e3b5')), (1, hexa('#1af3c3'))]), FORMAS['topo'])
img = camada(img, solido('#04392d', 90), FORMAS['dobraTopo'])
img = camada(img, degrade(0, 66, 56, 46, [(0, hexa('#0aa98b')), (.5, hexa('#11e2b8')), (1, hexa('#0ff6cc'))]), FORMAS['meio'])

# PNGs entram no HTML como ícone da janela (barra de tarefas) e da aba; o .ico vai no atalho.
for t in (32, 256):
    img.resize((t, t), Image.LANCZOS).save(os.path.join(AQUI, f'fluxo-{t}.png'), optimize=True)
img.save(os.path.join(AQUI, 'fluxo.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('ferramentas/fluxo.ico, fluxo-32.png e fluxo-256.png gerados')
