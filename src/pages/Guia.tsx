import { MainLayout } from '@/components/layout/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, ChevronRight } from 'lucide-react';

const Guia = () => {
  return (
    <MainLayout 
      title="Guia de Uso" 
      subtitle="Manual completo do sistema FleetPro"
    >
      <div className="animate-fade-in">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="prose prose-invert max-w-none pr-4">
            {/* Índice */}
            <div className="rounded-xl bg-card border border-border p-6 mb-8">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                <Book className="w-5 h-5 text-primary" />
                Índice
              </h2>
              <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { href: '#primeiros-passos', label: 'Primeiros Passos' },
                  { href: '#motoristas', label: 'Cadastro e Edição de Motoristas' },
                  { href: '#veiculos', label: 'Cadastro e Edição de Veículos' },
                  { href: '#abastecimentos', label: 'Registro de Abastecimentos' },
                  { href: '#viagens', label: 'Registro de Viagens e Ciclos' },
                  { href: '#manutencoes', label: 'Manutenções' },
                  { href: '#pneus', label: 'Controle de Pneus' },
                  { href: '#jornada', label: 'Jornada dos Motoristas' },
                  { href: '#gamificacao', label: 'Gamificação' },
                  { href: '#dashboard', label: 'Dashboard e Filtros' },
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
              <h2 className="text-xl font-bold text-foreground mb-4">Cadastro e Edição de Motoristas</h2>
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
              <h2 className="text-xl font-bold text-foreground mb-4">Cadastro e Edição de Veículos</h2>
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
                <li><span className="text-success">Verde</span> = acima da meta</li>
                <li><span className="text-destructive">Vermelho</span> = abaixo da meta</li>
              </ul>
            </section>

            {/* Viagens */}
            <section id="viagens" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Registro de Viagens e Ciclos</h2>
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
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Registrar Jornada</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Clique em <strong>Jornada</strong> no menu</li>
                <li>Clique em <strong>"Nova Entrada"</strong></li>
                <li>Selecione Motorista, Veículo e Tipo</li>
                <li>Tipos: Início de Jornada, Fim de Jornada, Parada, Retorno</li>
              </ol>
            </section>

            {/* Gamificação */}
            <section id="gamificacao" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Gamificação</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Critérios de Pontuação</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Consumo de Combustível:</strong> Eficiência km/L</li>
                <li><strong>Cuidado com Pneus:</strong> Menos incidentes = mais pontos</li>
                <li><strong>Manutenção:</strong> Menos corretivas = mais pontos</li>
                <li><strong>Jornada:</strong> Cumprimento de horários</li>
                <li><strong>Velocidade:</strong> Uso da faixa verde do motor</li>
              </ul>
            </section>

            {/* Dashboard */}
            <section id="dashboard" className="rounded-xl bg-card border border-border p-6 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Dashboard e Filtros de Período</h2>
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
                    <li>Pode registrar jornadas</li>
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
              </ul>
            </section>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
};

export default Guia;
