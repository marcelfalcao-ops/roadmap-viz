# Epic Roadmap Gantt — Looker Studio Community Visualization

Gantt chart interativo com épicos expansíveis para uso no Looker Studio.
Conecta diretamente à aba **Roadmap** gerada pelo `Roadmap.gs`.

---

## Deploy no GitHub Pages (passo a passo)

### 1. Criar o repositório

1. Acesse github.com → **New repository**
2. Nome: `roadmap-viz`
3. Visibilidade: **Public**
4. Marque **Add a README file**
5. Clique **Create repository**

### 2. Fazer upload dos arquivos

Dentro do repositório criado:

1. Clique em **Add file → Upload files**
2. Envie os 4 arquivos desta pasta:
   - `manifest.json`
   - `vizConfig.json`
   - `index.js`
   - `index.css`
3. Commit: `Add Community Visualization files`

### 3. Ativar o GitHub Pages

1. Vá em **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / pasta `/ (root)`
4. Clique **Save**
5. Aguarde ~1 minuto. Aparecerá a URL:
   `https://SEU-USUARIO.github.io/roadmap-viz/`

### 4. Atualizar o manifest.json com sua URL

Edite o `manifest.json` e substitua **todas** as ocorrências de `SEU-USUARIO`
pelo seu nome de usuário GitHub real. Faça commit da alteração.

---

## Registrar no Looker Studio

1. Acesse [lookerstudio.google.com](https://lookerstudio.google.com)
2. Abra (ou crie) um relatório
3. **Inserir → Community Visualization**
4. Em "Visualizações da comunidade", clique no **ícone de chave** (⚙)
5. Cole a URL do manifest:
   ```
   https://SEU-USUARIO.github.io/roadmap-viz/manifest.json
   ```
6. Clique **Enviar** e aceite o aviso de segurança

---

## Conectar à planilha

1. Adicione a fonte de dados: **Google Sheets → sua planilha → aba Roadmap**
2. Mapeie os campos na barra lateral direita:

| Campo na viz      | Coluna da aba Roadmap |
|-------------------|-----------------------|
| Chave             | Chave                 |
| Tipo              | Tipo                  |
| Resumo            | Resumo                |
| Responsável       | Responsável           |
| Status            | Status                |
| Início            | Início                |
| Fim               | Fim                   |
| Duração (dias)    | Duração (dias)        |

> **Atenção:** As colunas Início e Fim precisam ser do tipo **Texto** (não Date)
> no conector do Looker Studio, pois o script grava no formato `dd/MM/yyyy`.
> No Looker Studio, clique no campo → **Tipo → Texto** se necessário.

---

## Opções de estilo

No painel de estilo da viz você pode ajustar:

| Opção                        | Valores                     |
|------------------------------|-----------------------------|
| Altura das barras de épico   | 14 / 18 / 24 px             |
| Largura de cada mês          | 50 / 70 / 100 px            |
| Mostrar barras das issues    | ✓ / ✗                       |
| Tema escuro                  | ✓ / ✗                       |

---

## Atualizar a visualização

Basta editar os arquivos no GitHub e fazer commit.
O Looker Studio recarrega o `index.js` a cada exibição do relatório —
não é necessário re-registrar a viz.
