class SistemaEmbarque {
    constructor() {
        this.calendar = null;
        this.dados = {
            dataEmbarque: null,
            diasEmbarcado: 15,
            nomeUsuario: 'Marítimo'
        };
        this.init();
    }

    init() {
        // Verificar se já tem dados salvos
        const dadosSalvos = localStorage.getItem('dadosEmbarque');
        if (dadosSalvos) {
            this.dados = JSON.parse(dadosSalvos);
            // Se tiver dados, vai direto pro dashboard
            if (this.dados.dataEmbarque) {
                this.irParaDashboard();
            }
        }
    }

    // CONFIGURAÇÃO INICIAL
    salvarConfiguracaoInicial() {
        const dataEmbarque = document.getElementById('data-embarque').value;
        const diasEmbarcado = document.getElementById('dias-embarcado').value;
        const nomeUsuario = document.getElementById('nome-usuario').value || 'Marítimo';

        if (!dataEmbarque || !diasEmbarcado) {
            this.showToast('Preencha a data e os dias de embarque!', 'error');
            return false;
        }

        this.dados = {
            dataEmbarque: dataEmbarque,
            diasEmbarcado: parseInt(diasEmbarcado),
            nomeUsuario: nomeUsuario
        };

        // Salvar no localStorage
        localStorage.setItem('dadosEmbarque', JSON.stringify(this.dados));
        
        this.irParaDashboard();
        this.showToast('Configuração salva com sucesso!', 'success');
        return true;
    }

    // ATUALIZAR CONFIGURAÇÃO
    atualizarConfiguracao() {
        const dataEmbarque = document.getElementById('edit-data-embarque').value;
        const diasEmbarcado = document.getElementById('edit-dias-embarcado').value;
        const nomeUsuario = document.getElementById('edit-nome-usuario').value;

        if (dataEmbarque) this.dados.dataEmbarque = dataEmbarque;
        if (diasEmbarcado) this.dados.diasEmbarcado = parseInt(diasEmbarcado);
        if (nomeUsuario) this.dados.nomeUsuario = nomeUsuario;

        localStorage.setItem('dadosEmbarque', JSON.stringify(this.dados));
        
        this.atualizarInterface();
        this.inicializarCalendario();
        this.calcularProjecao2Anos();
        this.showToast('Dados atualizados!', 'success');
        
        // Voltar para o calendário
        this.showPage('calendar');
    }

    // IR PARA DASHBOARD
    irParaDashboard() {
        document.getElementById('config-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        
        this.atualizarInterface();
        
        setTimeout(() => {
            this.inicializarCalendario();
            this.calcularProjecao2Anos();
        }, 200);
    }

    // ATUALIZAR INTERFACE
    atualizarInterface() {
        // Atualizar nome na sidebar
        const displayNome = document.getElementById('display-nome');
        if (displayNome) displayNome.textContent = this.dados.nomeUsuario;

        // Atualizar data na sidebar
        const displayData = document.getElementById('display-data');
        if (displayData && this.dados.dataEmbarque) {
            const data = new Date(this.dados.dataEmbarque);
            displayData.textContent = `Próximo embarque: ${data.toLocaleDateString('pt-BR')}`;
        }

        // Preencher campos de edição
        const editData = document.getElementById('edit-data-embarque');
        const editDias = document.getElementById('edit-dias-embarcado');
        const editNome = document.getElementById('edit-nome-usuario');

        if (editData && this.dados.dataEmbarque) editData.value = this.dados.dataEmbarque;
        if (editDias) editDias.value = this.dados.diasEmbarcado;
        if (editNome) editNome.value = this.dados.nomeUsuario;
    }

    // CALENDÁRIO
    inicializarCalendario() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        calendarEl.innerHTML = '';

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'dayGridMonth'
            },
            events: this.gerarEventos(),
            height: 'auto',
            contentHeight: 'auto'
        });

        this.calendar.render();
    }

    gerarEventos() {
        const eventos = [];
        
        if (this.dados.dataEmbarque && this.dados.diasEmbarcado) {
            const startDate = new Date(this.dados.dataEmbarque);
            const dias = this.dados.diasEmbarcado;
            
            // Evento do primeiro dia (azul)
            eventos.push({
                title: '🚢 Início',
                start: startDate.toISOString().split('T')[0],
                color: '#0d6efd',
                textColor: 'white'
            });

            // Dias embarcados (vermelho)
            for (let i = 0; i < dias; i++) {
                const eventDate = new Date(startDate);
                eventDate.setDate(startDate.getDate() + i);
                
                eventos.push({
                    title: '⚓ Embarcado',
                    start: eventDate.toISOString().split('T')[0],
                    color: '#dc3545',
                    textColor: 'white'
                });
            }
        }

        return eventos;
    }

    // PROJEÇÃO 2 ANOS
    calcularProjecao2Anos() {
        if (!this.dados.dataEmbarque || !this.dados.diasEmbarcado) return;

        const startDate = new Date(this.dados.dataEmbarque);
        const diasEmbarcado = this.dados.diasEmbarcado;
        
        let totalEmbarques = 0;
        let totalDiasMar = 0;
        const timeline = [];
        
        for (let i = 0; i < 24; i++) {
            const mes = new Date(startDate);
            mes.setMonth(startDate.getMonth() + i);
            
            const diasMes = [];
            for (let j = 0; j < 30; j++) {
                if (j < diasEmbarcado) {
                    diasMes.push({ status: 'embarcado' });
                    totalDiasMar++;
                    if (j === 0) totalEmbarques++;
                } else {
                    diasMes.push({ status: 'folga' });
                }
            }
            
            timeline.push({
                mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                dias: diasMes
            });
        }

        // Atualizar estatísticas
        document.getElementById('total-embarques').textContent = totalEmbarques;
        document.getElementById('total-dias-mar').textContent = totalDiasMar;
        document.getElementById('total-dias-casa').textContent = (24 * 30) - totalDiasMar;

        this.renderTimeline(timeline);
        this.gerarResumoAnual();
    }

    renderTimeline(timeline) {
        const container = document.getElementById('timeline-2anos');
        if (!container) return;
        
        container.innerHTML = '';
        
        timeline.slice(0, 12).forEach((mes) => {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'timeline-month';
            
            const header = document.createElement('div');
            header.className = 'month-header';
            header.textContent = mes.mes;
            
            const days = document.createElement('div');
            days.className = 'month-days';
            
            mes.dias.slice(0, 15).forEach(dia => {
                const dayBlock = document.createElement('div');
                dayBlock.className = `day-block ${dia.status}`;
                days.appendChild(dayBlock);
            });
            
            monthDiv.appendChild(header);
            monthDiv.appendChild(days);
            container.appendChild(monthDiv);
        });
    }

    gerarResumoAnual() {
        const container = document.getElementById('resumo-anual');
        if (!container) return;
        
        const ano = new Date().getFullYear();
        const diasEmbarcado = this.dados.diasEmbarcado || 15;
        
        container.innerHTML = `
            <div class="resumo-ano">
                <h4>${ano}</h4>
                <p>Embarques: 12</p>
                <p>Dias no mar: ${diasEmbarcado * 12}</p>
                <p>Dias em casa: ${365 - (diasEmbarcado * 12)}</p>
            </div>
            <div class="resumo-ano">
                <h4>${ano + 1}</h4>
                <p>Embarques: 12</p>
                <p>Dias no mar: ${diasEmbarcado * 12}</p>
                <p>Dias em casa: ${365 - (diasEmbarcado * 12)}</p>
            </div>
        `;
    }

    // MUDAR PÁGINA
    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const selectedPage = document.getElementById(`${pageName}-page`);
        if (selectedPage) selectedPage.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItems = document.querySelectorAll('.nav-item');
        if (pageName === 'calendar' && navItems[0]) navItems[0].classList.add('active');
        if (pageName === 'projecao' && navItems[1]) navItems[1].classList.add('active');
        if (pageName === 'config' && navItems[2]) navItems[2].classList.add('active');
        
        if (pageName === 'projecao') {
            setTimeout(() => this.calcularProjecao2Anos(), 100);
        }
    }

    // SIDEBAR
    toggleSidebar() {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('sidebar-overlay').classList.add('active');
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }

    // REINICIAR
    reiniciar() {
        localStorage.removeItem('dadosEmbarque');
        this.dados = {
            dataEmbarque: null,
            diasEmbarcado: 15,
            nomeUsuario: 'Marítimo'
        };
        
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('config-screen').style.display = 'flex';
        
        // Limpar campos
        document.getElementById('data-embarque').value = '';
        document.getElementById('dias-embarcado').value = '';
        document.getElementById('nome-usuario').value = '';
        
        this.showToast('Dados reiniciados!', 'success');
    }

    // TOAST
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        if (type === 'success') toast.style.background = '#198754';
        if (type === 'error') toast.style.background = '#dc3545';
        if (type === 'info') toast.style.background = '#212529';
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Instância global
const sistema = new SistemaEmbarque();

// ============ FUNÇÕES GLOBAIS ============
function iniciarSistema() {
    sistema.salvarConfiguracaoInicial();
}

function atualizarConfiguracao() {
    sistema.atualizarConfiguracao();
}

function showPage(pageName) {
    sistema.showPage(pageName);
}

function toggleSidebar() {
    sistema.toggleSidebar();
}

function closeSidebar() {
    sistema.closeSidebar();
}

function reconfigurar() {
    sistema.reiniciar();
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Garantir estado inicial
    const configScreen = document.getElementById('config-screen');
    const dashboard = document.getElementById('dashboard');
    
    if (configScreen) configScreen.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
});
