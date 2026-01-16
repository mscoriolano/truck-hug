import { MainLayout } from '@/components/layout/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const Guia = () => {
  return (
    <MainLayout 
      title="Guia de Uso" 
      subtitle="Manual completo do sistema FleetPro"
    >
      <div className="animate-fade-in">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="prose prose-invert max-w-none pr-4">
            {/* Aviso sobre status da integração */}
            <div className="rounded-xl bg-warning/10 border border-warning/30 p-6 mb-8">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Status da Integração TrucksControl</h3>
                  <p className="text-muted-foreground mb-3">
                    A integração com a TrucksControl está configurada mas o webservice não está respondendo às requisições. 
                    Os dados de telemetria em tempo real (velocidade, localização, força G, consumo automático) ainda não estão disponíveis.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>O que funciona agora:</strong> Todos os cadastros manuais (motoristas, veículos, abastecimentos, viagens, manutenções, pneus, jornada) 
                    e as estatísticas calculadas a partir desses dados.
                  </p>
                </div>
              </div>
            </div>

            {/* Índice */}
            <div className="rounded-xl bg-card border border-border p-6 mb-8">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                <Book className="w-5 h-5 text-primary" />
                Índice
              </h2>
              <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { href: '#primeiros-passos', label: 'Primeiros Passos' },
                  { href: '#motoristas', label: 'Cadastro de Motoristas' },
                  { href: '#veiculos', label: 'Cadastro de Veículos' },
                  { href: '#abastecimentos', label: 'Registro de Abastecimentos' },
                  { href: '#viagens', label: 'Registro de Viagens e Ciclos' },
                  { href: '#manutencoes', label: 'Manutenções' },
                  { href: '#pneus', label: 'Controle de Pneus' },
                  { href: '#jornada', label: 'Jornada dos Motoristas' },
                  { href: '#gamificacao', label: 'Gamificação e Scores' },
                  { href: '#metas', label: 'Sistema de Metas' },
                  { href: '#dashboard', label: 'Dashboard Principal' },
                  { href: '#dashboard-executivo', label: 'Dashboard Executivo' },
                  { href: '#telemetria', label: 'Telemetria' },
                  { href: '#gestao-financeira', label: 'Gestão Financeira' },
                  { href: '#portal-motorista', label: 'Portal do Motorista' },
                  { href: '#permissoes', label: 'Sistema de Permissões' },
                ].map((item) => (
                  <a 
                    key={item.href} 
                    href={item.href}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-secondary"
                  >
                    <ChevronRight className="w-4 h-4" />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Primeiros Passos */}
            <section id="primeiros-passos" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Primeiros Passos</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Acessando o Sistema</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Acesse a URL do sistema</li>
                <li>Na tela de login, insira seu email e senha</li>
                <li>Se não tiver conta, clique em "Criar conta" e preencha os dados</li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Navegação</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Use o menu lateral esquerdo para navegar entre as seções</li>
                <li>O menu pode ser recolhido clicando na seta</li>
                <li>Cada ícone representa uma funcionalidade diferente</li>
              </ul>
            </section>

            {/* Motoristas */}
            <section id="motoristas" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Cadastro de Motoristas</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Cadastrar Novo Motorista</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>No menu lateral, clique em <strong>Motoristas</strong></li>
                <li>Clique no botão <strong>"Novo Motorista"</strong></li>
                <li>Preencha os campos: Nome, Telefone, CNH, Vencimento, Categoria, R3, AC e Status</li>
                <li>Clique em <strong>"Cadastrar"</strong></li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Status Disponíveis</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Disponível:</strong> Pronto para trabalhar</li>
                <li><strong>Dirigindo:</strong> Em viagem</li>
                <li><strong>Descansando:</strong> Em período de descanso</li>
                <li><strong>Folga:</strong> Dia de folga</li>
                <li><strong>Férias:</strong> Em período de férias</li>
                <li><strong>Licença:</strong> Afastado por licença</li>
                <li><strong>Desligado:</strong> Não trabalha mais na empresa</li>
              </ul>
            </section>

            {/* Veículos */}
            <section id="veiculos" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Cadastro de Veículos</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Cadastrar Novo Veículo</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>No menu lateral, clique em <strong>Veículos</strong></li>
                <li>Clique no botão <strong>"Novo Veículo"</strong></li>
                <li>Preencha: Placa, Modelo, Marca, Ano, Km, Combustível, Meta km/L, Próx. Manutenção</li>
                <li>Clique em <strong>"Cadastrar"</strong></li>
              </ol>
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-sm text-foreground">
                  <strong>💡 Dica:</strong> A meta de consumo (km/L) é usada para calcular a economia ou prejuízo nos gráficos de abastecimentos.
                </p>
              </div>
            </section>

            {/* Abastecimentos */}
            <section id="abastecimentos" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Registro de Abastecimentos</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional com dados manuais</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Registrar Novo Abastecimento</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>No menu lateral, clique em <strong>Abastecimentos</strong></li>
                <li>Clique em <strong>"Novo Abastecimento"</strong></li>
                <li>Selecione Veículo e Motorista</li>
                <li>Informe: Litros, Preço/Litro, Quilometragem atual</li>
                <li>O sistema calcula o custo total automaticamente</li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Cálculo de Consumo km/L</h3>
              <p className="text-muted-foreground">
                O sistema calcula automaticamente o consumo dividindo a diferença de km entre abastecimentos pela quantidade de litros.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li><span className="text-success">Verde</span> = acima da meta do veículo</li>
                <li><span className="text-destructive">Vermelho</span> = abaixo da meta do veículo</li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Gráficos Disponíveis</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Consumo Médio por Motorista:</strong> Separado por tipo de veículo</li>
                <li><strong>Ganho/Perda por Motorista:</strong> Economia ou prejuízo em R$</li>
                <li><strong>Custo por Veículo:</strong> Total gasto por placa</li>
                <li><strong>Evolução do Consumo:</strong> Gráfico de linha ao longo do tempo</li>
              </ul>
            </section>

            {/* Viagens */}
            <section id="viagens" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Registro de Viagens e Ciclos</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional com dados manuais</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">O que é um Ciclo?</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>1 viagem carregada = <strong>0.5 ciclo</strong></li>
                <li>Escoamento + Abastecimento (ambos carregados) = <strong>1 ciclo completo</strong></li>
                <li>Viagem com peso 0 (vazio) = <strong>0 ciclo</strong></li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Tipos de Viagem</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Escoamento:</strong> Saída da base (indo entregar)</li>
                <li><strong>Abastecimento:</strong> Retorno à base</li>
              </ul>
            </section>

            {/* Manutenções */}
            <section id="manutencoes" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Manutenções</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Agendar Manutenção</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Clique em <strong>Manutenções</strong> no menu</li>
                <li>Clique em <strong>"Nova Manutenção"</strong></li>
                <li>Selecione Veículo, Tipo (Preventiva/Corretiva), Categoria</li>
                <li>Informe descrição, data e custo estimado</li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Status</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Agendada:</strong> Programada</li>
                <li><strong>Em andamento:</strong> Sendo executada</li>
                <li><strong>Concluída:</strong> Finalizada</li>
                <li><strong>Atrasada:</strong> Passou da data</li>
              </ul>
            </section>

            {/* Pneus */}
            <section id="pneus" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Controle de Pneus</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Cadastrar Pneu</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Clique em <strong>Pneus</strong> no menu</li>
                <li>Clique em <strong>"Novo Pneu"</strong></li>
                <li>Selecione Veículo e Posição</li>
                <li>Informe Marca, Modelo, Data de instalação</li>
                <li>Configure km e medição de sulco</li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Status por Sulco</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><span className="text-success font-medium">Bom:</span> Sulco ≥ 5.0mm (configurável)</li>
                <li><span className="text-warning font-medium">Atenção:</span> Sulco entre 3.0mm e 5.0mm (configurável)</li>
                <li><span className="text-destructive font-medium">Crítico:</span> Sulco ≤ 1.6mm (limite legal)</li>
              </ul>
            </section>

            {/* Jornada */}
            <section id="jornada" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Jornada dos Motoristas</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Registrar Jornada</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Clique em <strong>Jornada</strong> no menu</li>
                <li>Clique em <strong>"Nova Entrada"</strong></li>
                <li>Selecione Motorista, Veículo e Tipo</li>
                <li>Tipos: Início de Jornada, Fim de Jornada, Parada, Retorno</li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Filtros de Status</h3>
              <p className="text-muted-foreground">
                Você pode filtrar motoristas por status: Todos, Disponível, Dirigindo, Descansando, Folga, Férias, Licença ou Desligado.
              </p>
            </section>

            {/* Gamificação */}
            <section id="gamificacao" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Gamificação e Scores</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Critérios de Pontuação</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Consumo de Combustível:</strong> Eficiência km/L comparado à meta</li>
                <li><strong>Cuidado com Pneus:</strong> Menos incidentes = mais pontos</li>
                <li><strong>Manutenção:</strong> Menos corretivas = mais pontos</li>
                <li><strong>Jornada:</strong> Cumprimento de horários</li>
                <li><strong>Velocidade:</strong> Uso da faixa verde do motor (quando telemetria disponível)</li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Ranking</h3>
              <p className="text-muted-foreground">
                Os motoristas são ranqueados por score total. Use os filtros de período para comparar performance em diferentes intervalos.
              </p>
            </section>

            {/* Metas */}
            <section id="metas" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Sistema de Metas</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Criar Meta Mensal</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>No menu lateral, clique em <strong>Metas</strong></li>
                <li>Clique em <strong>"Nova Meta"</strong></li>
                <li>Selecione o motorista, mês e ano</li>
                <li>Defina as metas: Score mínimo, Km mínimo, Consumo máximo, Violações máximas</li>
                <li>Configure o valor do bônus para atingimento</li>
              </ol>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Cálculo do Bônus</h3>
              <p className="text-muted-foreground">
                O bônus é liberado quando todas as metas do mês são atingidas. O sistema calcula automaticamente com base nos dados registrados.
              </p>
            </section>

            {/* Dashboard */}
            <section id="dashboard" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Dashboard Principal</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Filtros Disponíveis</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Tudo:</strong> Todo o histórico</li>
                <li><strong>Hoje:</strong> Apenas dados de hoje</li>
                <li><strong>Esta Semana:</strong> Últimos 7 dias</li>
                <li><strong>Este Mês:</strong> Mês atual</li>
                <li><strong>Mês Anterior:</strong> Mês passado</li>
                <li><strong>Este Ano:</strong> Ano atual</li>
                <li><strong>Ano Anterior:</strong> Ano passado</li>
                <li><strong>Personalizado:</strong> Datas específicas</li>
              </ul>
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-sm text-foreground">
                  <strong>💡 Dica:</strong> Clique em qualquer card no Dashboard para ir direto à seção correspondente.
                </p>
              </div>
            </section>

            {/* Dashboard Executivo */}
            <section id="dashboard-executivo" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Dashboard Executivo</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional com dados manuais</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">KPIs Exibidos</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Disponibilidade da Frota:</strong> % de veículos ativos</li>
                <li><strong>Motoristas:</strong> Quantos estão dirigindo agora</li>
                <li><strong>Custo Combustível:</strong> Total gasto no período</li>
                <li><strong>Consumo Médio:</strong> km/L da frota</li>
                <li><strong>Custo Manutenção:</strong> Total gasto em manutenções</li>
                <li><strong>Alertas:</strong> Quantidade de alertas pendentes</li>
                <li><strong>Total Viagens:</strong> Número de viagens no período</li>
                <li><strong>KM Rodados:</strong> Distância total percorrida</li>
                <li><strong>Peso Transportado:</strong> Total em toneladas</li>
                <li><strong>Score Médio:</strong> Pontuação média dos motoristas</li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Gráficos</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Status da Frota (pizza)</li>
                <li>Status dos Motoristas (pizza)</li>
                <li>Distribuição de Custos (pizza)</li>
                <li>Consumo por Veículo (barras)</li>
                <li>Top Motoristas por Score (lista)</li>
              </ul>
            </section>

            {/* Telemetria */}
            <section id="telemetria" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Telemetria</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-warning/10 rounded-lg border border-warning/30">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-sm text-foreground">Aguardando conexão com TrucksControl</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Funcionalidades Previstas</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Mapa:</strong> Localização em tempo real dos veículos</li>
                <li><strong>Velocidade:</strong> Monitoramento de velocidade com limites configuráveis</li>
                <li><strong>Força G:</strong> Detecção de frenagens e acelerações bruscas</li>
                <li><strong>Consumo:</strong> Consumo em tempo real (atualmente usa dados manuais)</li>
                <li><strong>Alertas:</strong> Alertas automáticos de velocidade, ociosidade, etc.</li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Configurações</h3>
              <p className="text-muted-foreground">
                Clique em "Configurações" para definir limites de velocidade urbana/rodovia, tempos de ociosidade, 
                limiares de força G e consumo esperado.
              </p>
            </section>

            {/* Gestão Financeira */}
            <section id="gestao-financeira" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Gestão Financeira</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Performance Mensal</h3>
              <p className="text-muted-foreground mb-2">
                Registre os dados mensais de performance financeira da frota:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Custos fixos e variáveis</li>
                <li>Peso faturado</li>
                <li>Custo de frete externo</li>
                <li>Resultado mensal e acumulado</li>
                <li>Custo evitado</li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Custos Mensais</h3>
              <p className="text-muted-foreground">
                Registre custos por categoria (combustível, manutenção, pessoal, etc.) para análise detalhada.
              </p>
            </section>

            {/* Portal do Motorista */}
            <section id="portal-motorista" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Portal do Motorista</h2>
              <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">Funcionalidade 100% operacional</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Funcionalidades</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Abastecimento:</strong> Registrar abastecimentos com upload de comprovante</li>
                <li><strong>Solicitação de Manutenção:</strong> Reportar problemas no veículo</li>
                <li><strong>Relatório de Pneus:</strong> Informar condição dos pneus</li>
                <li><strong>Comprovante de Entrega:</strong> Registrar entregas com assinatura</li>
                <li><strong>Reembolso de Despesas:</strong> Solicitar reembolsos com comprovantes</li>
                <li><strong>Vinculação Veículo:</strong> Ver veículo atribuído</li>
              </ul>
            </section>

            {/* Permissões */}
            <section id="permissoes" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Sistema de Permissões</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Administrador (admin)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Acesso total a todas as funções</li>
                    <li>Pode gerenciar outros usuários</li>
                  </ul>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Gerente (manager)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Visualização e edição completa</li>
                    <li>Não pode excluir registros críticos</li>
                  </ul>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Visualizador (viewer)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Acesso apenas para visualização</li>
                    <li>Não pode fazer alterações</li>
                  </ul>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Motorista (driver)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Acesso restrito aos próprios dados</li>
                    <li>Usa o Portal do Motorista</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Dicas */}
            <section className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">💡 Dicas Importantes</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground">
                <li><strong>Sempre informe a quilometragem</strong> nos abastecimentos para cálculo correto do km/L</li>
                <li><strong>Use o peso correto nas viagens</strong> para contagem precisa de ciclos</li>
                <li><strong>Mantenha o vencimento da CNH atualizado</strong> - o sistema alerta quando está próximo</li>
                <li><strong>Use os filtros de período</strong> para análises mensais de performance</li>
                <li><strong>Registre a jornada diariamente</strong> para controle preciso das horas</li>
                <li><strong>Atualize a medição de sulco dos pneus</strong> regularmente para manter o status correto</li>
                <li><strong>Configure a meta de consumo por veículo</strong> para cálculos precisos de economia/prejuízo</li>
                <li><strong>Use o Dashboard Executivo</strong> para visão consolidada de toda a operação</li>
              </ul>
            </section>

            {/* Status das Funcionalidades */}
            <section className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">📊 Status das Funcionalidades</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Cadastros (Motoristas, Veículos, Pneus) - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Abastecimentos e Gráficos de Consumo - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Viagens e Ciclos - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Manutenções - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Jornada dos Motoristas - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Gamificação e Metas - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Dashboard e Dashboard Executivo - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Portal do Motorista - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-foreground">Gestão Financeira - Operacional</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="text-foreground">Telemetria em Tempo Real - Aguardando TrucksControl</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-info/10 rounded-lg">
                  <Info className="w-5 h-5 text-info" />
                  <span className="text-foreground">Consumo de telemetria usa dados de abastecimento manual</span>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
};

export default Guia;
