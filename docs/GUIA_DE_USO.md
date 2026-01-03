# FleetPro - Guia de Uso do Sistema

## Índice
1. [Primeiros Passos](#primeiros-passos)
2. [Cadastro e Edição de Motoristas](#cadastro-e-edição-de-motoristas)
3. [Cadastro e Edição de Veículos](#cadastro-e-edição-de-veículos)
4. [Registro de Abastecimentos](#registro-de-abastecimentos)
5. [Registro de Viagens e Ciclos](#registro-de-viagens-e-ciclos)
6. [Manutenções](#manutenções)
7. [Controle de Pneus](#controle-de-pneus)
8. [Jornada dos Motoristas](#jornada-dos-motoristas)
9. [Gamificação](#gamificação)
10. [Dashboard e Filtros de Período](#dashboard-e-filtros-de-período)
11. [Sistema de Permissões](#sistema-de-permissões)

---

## Primeiros Passos

### Acessando o Sistema
1. Acesse a URL do sistema
2. Na tela de login, insira seu email e senha
3. Se não tiver conta, clique em "Criar conta" e preencha os dados

### Navegação
- Use o menu lateral esquerdo para navegar entre as seções
- O menu pode ser recolhido clicando na seta
- Cada ícone representa uma funcionalidade diferente

---

## Cadastro e Edição de Motoristas

### Cadastrar Novo Motorista
1. No menu lateral, clique em **Motoristas**
2. Clique no botão **"Novo Motorista"**
3. Preencha os campos:
   - **Nome Completo**: Nome do motorista
   - **Telefone**: Número de contato
   - **Número CNH**: Número da carteira de habilitação
   - **Vencimento CNH**: Data de vencimento (o sistema alertará quando estiver próximo)
   - **Categoria CNH**: A, B, C, D, E, AB, AC, AD, AE
   - **R3**: Código interno R3 da empresa
   - **AC**: Código interno AC da empresa
   - **Status**: Disponível, Dirigindo, Descansando, Folga, Férias, Licença ou Desligado
4. Clique em **"Cadastrar"**

### Editar Motorista
1. Na lista de motoristas, localize o motorista desejado
2. Clique no ícone de três pontos (⋮) na coluna da direita
3. Selecione **"Editar"**
4. Faça as alterações necessárias
5. Clique em **"Salvar Alterações"**

### Alterar Status do Motorista
1. Edite o motorista (conforme acima)
2. Altere o campo **Status** para a opção desejada:
   - **Disponível**: Pronto para trabalhar
   - **Dirigindo**: Em viagem
   - **Descansando**: Em período de descanso obrigatório
   - **Folga**: Dia de folga
   - **Férias**: Em período de férias
   - **Licença**: Afastado por licença
   - **Desligado**: Não trabalha mais na empresa

### Excluir Motorista
1. Clique no ícone de três pontos (⋮)
2. Selecione **"Excluir"**
3. Confirme a exclusão

---

## Cadastro e Edição de Veículos

### Cadastrar Novo Veículo
1. No menu lateral, clique em **Veículos**
2. Clique no botão **"Novo Veículo"**
3. Preencha os campos:
   - **Placa**: Placa do veículo
   - **Modelo**: Modelo do veículo
   - **Marca**: Fabricante
   - **Ano**: Ano de fabricação
   - **Quilometragem**: Km atual
   - **Combustível**: Diesel, Gasolina, Flex ou Elétrico
   - **Meta Consumo (km/L)**: Meta de eficiência de combustível
   - **Próxima Manutenção**: Data da próxima manutenção programada
   - **Status**: Ativo, Em manutenção ou Inativo
4. Clique em **"Cadastrar"**

### Editar Veículo
1. Na lista de veículos, localize o veículo desejado
2. Clique no ícone de três pontos (⋮)
3. Selecione **"Editar"**
4. Faça as alterações (incluindo a meta de consumo km/L)
5. Clique em **"Salvar Alterações"**

---

## Registro de Abastecimentos

### Registrar Novo Abastecimento
1. No menu lateral, clique em **Abastecimentos**
2. Clique no botão **"Novo Abastecimento"**
3. Preencha os campos:
   - **Veículo**: Selecione o veículo abastecido
   - **Motorista**: Selecione quem fez o abastecimento
   - **Litros**: Quantidade de combustível
   - **Preço/Litro**: Valor pago por litro
   - **Quilometragem**: Km atual do veículo (IMPORTANTE para cálculo de consumo)
   - **Combustível**: Tipo de combustível
   - **Posto**: Nome do posto (opcional)
   - **Data**: Data do abastecimento
   - **Observações**: Notas adicionais (opcional)
4. O sistema calcula automaticamente o custo total
5. Clique em **"Registrar Abastecimento"**

### Visualizar Consumo por Km
- A coluna **km/L** na lista mostra o consumo calculado
- Verde = acima da meta
- Vermelho = abaixo da meta

### Gráficos de Abastecimentos
1. Clique no botão **"Gráficos"** para ver:
   - Abastecimentos por motorista
   - Km rodados por motorista
   - Km rodados por veículo
   - Média km/L por veículo com linha de meta

---

## Registro de Viagens e Ciclos

### O que é um Ciclo?
- **1 viagem carregada = 0.5 ciclo**
- Escoamento (saída) carregado + Abastecimento (retorno) carregado = **1 ciclo completo**
- Viagem com peso 0 (vazio) = **0 ciclo**

### Registrar Nova Viagem
1. No menu lateral, clique em **Viagens**
2. Clique no botão **"Nova Viagem"**
3. Preencha os campos:
   - **Tipo de Viagem**: 
     - **Escoamento**: Saída da base (indo entregar)
     - **Abastecimento**: Retorno à base
   - **Veículo**: Selecione o veículo
   - **Motorista**: Selecione o motorista
   - **Data de Saída**: Data da viagem
   - **Peso Carregado (kg)**: 
     - Informe 0 se estiver vazio (não conta ciclo)
     - Informe o peso se carregado (conta 0.5 ciclo)
   - **Observações**: Notas adicionais (opcional)
4. Clique em **"Registrar Viagem"**

### Visualizar Ciclos
- Os resumos mostram:
  - Total de ciclos por motorista
  - Total de ciclos por veículo
- Use o filtro de período para ver ciclos de um mês específico

---

## Manutenções

### Agendar Manutenção
1. No menu lateral, clique em **Manutenções**
2. Clique no botão **"Nova Manutenção"**
3. Preencha os campos:
   - **Veículo**: Selecione o veículo
   - **Tipo**: Preventiva ou Corretiva
   - **Categoria**: Motor, Freios, Suspensão, etc.
   - **Descrição**: O que será feito
   - **Data Agendada**: Quando será realizada
   - **Custo**: Valor estimado (opcional)
   - **Observações**: Detalhes adicionais (opcional)
4. Clique em **"Agendar"**

### Atualizar Status da Manutenção
1. Na lista, clique no ícone de três pontos (⋮)
2. Altere o status para:
   - **Agendada**: Programada
   - **Em andamento**: Sendo executada
   - **Concluída**: Finalizada
   - **Atrasada**: Passou da data sem conclusão

---

## Controle de Pneus

### Cadastrar Pneu
1. No menu lateral, clique em **Pneus**
2. Clique no botão **"Novo Pneu"**
3. Preencha:
   - **Veículo**: Onde está instalado
   - **Posição**: Dianteiro esquerdo, traseiro direito, etc.
   - **Marca e Modelo**: Informações do pneu
   - **Data de Instalação**: Quando foi colocado
   - **Km na Instalação**: Quilometragem do veículo
   - **Km Atual**: Quilometragem atual
   - **Km Máximo**: Vida útil esperada
4. Clique em **"Cadastrar"**

### Status dos Pneus
- **Bom**: Dentro da vida útil
- **Atenção**: Próximo do limite
- **Crítico**: Precisa trocar

---

## Jornada dos Motoristas

### Registrar Início/Fim de Jornada
1. No menu lateral, clique em **Jornada**
2. Clique no botão **"Nova Entrada"**
3. Selecione:
   - **Motorista**
   - **Veículo**
   - **Tipo**: Início de Jornada, Fim de Jornada, Parada, Retorno, etc.
   - **Localização** (opcional)
   - **Quilometragem** (opcional)
4. Clique em **"Registrar"**

---

## Gamificação

### Como Funciona
O sistema calcula pontuações automáticas baseadas em:
- **Consumo de Combustível**: Eficiência km/L
- **Cuidado com Pneus**: Menos incidentes = mais pontos
- **Manutenção**: Menos corretivas = mais pontos
- **Jornada**: Cumprimento de horários
- **Velocidade**: Uso da faixa verde do motor

### Visualizar Ranking
1. No menu lateral, clique em **Gamificação**
2. Veja o ranking ordenado por pontuação
3. O motorista com melhor performance aparece em destaque
4. Use o filtro de período para ver performance de um mês específico

---

## Dashboard e Filtros de Período

### Usar o Filtro de Período
1. No topo de cada página, localize o seletor de período
2. Escolha uma opção:
   - **Tudo**: Mostra todo o histórico
   - **Hoje**: Apenas dados de hoje
   - **Esta Semana**: Últimos 7 dias
   - **Este Mês**: Mês atual
   - **Mês Anterior**: Mês passado
   - **Este Ano**: Ano atual
   - **Ano Anterior**: Ano passado
   - **Personalizado**: Defina datas específicas

### Navegação Rápida no Dashboard
- Clique em qualquer card de estatística para ir direto à seção correspondente
- Os cards são clicáveis e redirecionam para a página de detalhes

---

## Sistema de Permissões

### Tipos de Usuário

#### Administrador (admin)
- Acesso total a todas as funções
- Pode cadastrar, editar e excluir todos os registros
- Pode gerenciar outros usuários
- Pode alterar configurações do sistema

#### Gerente (manager)
- Visualização completa de todas as funções
- Pode cadastrar e editar registros
- Não pode excluir registros críticos
- Não pode gerenciar outros usuários

#### Visualizador (viewer)
- Acesso apenas para visualização
- Pode ver todos os dados e relatórios
- Não pode fazer alterações

#### Motorista (driver)
- Acesso restrito aos próprios dados
- Pode ver suas viagens, abastecimentos e jornadas
- Pode registrar novas entradas de jornada
- Não tem acesso a dados de outros motoristas

### Configuração de Permissões
A configuração de permissões é feita pelo administrador através do painel de configurações ou diretamente no banco de dados.

---

## Dicas Importantes

1. **Sempre informe a quilometragem** nos abastecimentos para que o sistema calcule corretamente o consumo km/L

2. **Use o peso correto nas viagens** para que a contagem de ciclos seja precisa

3. **Mantenha o vencimento da CNH atualizado** - o sistema alerta quando está próximo de vencer

4. **Use os filtros de período** para análises mensais de performance

5. **Registre a jornada diariamente** para um controle preciso das horas trabalhadas

---

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema.