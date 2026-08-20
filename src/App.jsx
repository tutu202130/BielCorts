import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

function App() {
  const [pagina, setPagina] = useState('inicio')

  // =====================================
  // DADOS PÚBLICOS
  // =====================================

  const [barbeiros, setBarbeiros] = useState([])
  const [servicos, setServicos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoServicos, setCarregandoServicos] = useState(false)

  // =====================================
  // AGENDAMENTO DO CLIENTE
  // =====================================

  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null)
  const [servicoSelecionado, setServicoSelecionado] = useState(null)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([])

  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)

  // =====================================
  // LOGIN
  // =====================================

  const [emailLogin, setEmailLogin] = useState('')
  const [senhaLogin, setSenhaLogin] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [entrando, setEntrando] = useState(false)

  // =====================================
  // BARBEIRO LOGADO
  // =====================================

  const [barbeiroLogado, setBarbeiroLogado] = useState(null)
  const [emailAtual, setEmailAtual] = useState('')

  // =====================================
  // AGENDAMENTOS
  // =====================================

  const [agendamentos, setAgendamentos] = useState([])
  const [carregandoAgendamentos, setCarregandoAgendamentos] =
    useState(false)

  const [mensagemPainel, setMensagemPainel] = useState('')

  // =====================================
  // CONTA
  // =====================================

  const [novoEmail, setNovoEmail] = useState('')
  const [emailPendente, setEmailPendente] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [mensagemConta, setMensagemConta] = useState('')

  // =====================================
  // SERVIÇOS ADMIN
  // =====================================

  const [servicosAdmin, setServicosAdmin] = useState([])
  const [edicoesServicos, setEdicoesServicos] = useState({})

  const [novoServicoNome, setNovoServicoNome] = useState('')
  const [novoServicoPreco, setNovoServicoPreco] = useState('')
  const [novoServicoDuracao, setNovoServicoDuracao] = useState('45')

  const [mensagemServicos, setMensagemServicos] = useState('')

  // =====================================
  // BLOQUEIOS
  // =====================================

  const [bloqueios, setBloqueios] = useState([])
  const [dataBloqueio, setDataBloqueio] = useState('')
  const [horarioBloqueio, setHorarioBloqueio] = useState('')
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [horariosBloqueio, setHorariosBloqueio] = useState([])
  const [mensagemBloqueio, setMensagemBloqueio] = useState('')

  // =====================================
  // CARREGAR BARBEIROS
  // =====================================

  async function carregarBarbeiros() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('barbeiros')
      .select('id, nome, ativo')
      .eq('ativo', true)
      .order('id')

    if (error) {
      console.log('Erro barbeiros:', error)
      setBarbeiros([])
    } else {
      setBarbeiros(data || [])
    }

    setCarregando(false)
  }

  // =====================================
  // SERVIÇOS DO BARBEIRO ESCOLHIDO
  // =====================================

  async function carregarServicosCliente(barbeiroId) {
    if (!barbeiroId) {
      setServicos([])
      return
    }

    setCarregandoServicos(true)

    const { data, error } = await supabase
      .from('servicos')
      .select(
        'id, nome, preco, duracao_minutos, ativo, barbeiro_id'
      )
      .eq('barbeiro_id', barbeiroId)
      .eq('ativo', true)
      .order('id')

    if (error) {
      console.log('Erro serviços:', error)
      setServicos([])
    } else {
      setServicos(data || [])
    }

    setCarregandoServicos(false)
  }

  // O filtro .eq() pode ser usado em consultas e atualizações
  // para limitar os registros ao barbeiro correto.

  useEffect(() => {
    if (!barbeiroSelecionado) {
      setServicos([])
      return
    }

    carregarServicosCliente(barbeiroSelecionado.id)
  }, [barbeiroSelecionado])

  // =====================================
  // INICIALIZAÇÃO
  // =====================================

  useEffect(() => {
    async function iniciar() {
      await carregarBarbeiros()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        setEmailAtual(session.user.email || '')

        const perfil = await carregarPerfilBarbeiro(
          session.user.id
        )

        if (perfil) {
          setPagina('painel')
        }
      }
    }

    iniciar()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setBarbeiroLogado(null)
        setAgendamentos([])
        setEmailAtual('')
        setEmailPendente('')
        setPagina('inicio')
      }

      if (session?.user?.email) {
        setEmailAtual(session.user.email)

        setEmailPendente((pendente) => {
          if (
            pendente &&
            session.user.email.toLowerCase() ===
              pendente.toLowerCase()
          ) {
            return ''
          }

          return pendente
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // =====================================
  // DATAS
  // =====================================

  function formatarDataBanco(data) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
  }

  function formatarDataExibicao(data) {
    return data.split('-').reverse().join('/')
  }

  function gerarDias() {
    const dias = []
    const hoje = new Date()

    for (let i = 0; i < 40 && dias.length < 24; i++) {
      const data = new Date(hoje)

      data.setDate(hoje.getDate() + i)

      // 0 = domingo
      if (data.getDay() !== 0) {
        dias.push({
          valor: formatarDataBanco(data),

          diaSemana: data
            .toLocaleDateString('pt-BR', {
              weekday: 'short',
            })
            .replace('.', ''),

          numero: data.getDate(),

          mes: data
            .toLocaleDateString('pt-BR', {
              month: 'short',
            })
            .replace('.', ''),
        })
      }
    }

    return dias
  }

  // =====================================
  // HORÁRIOS
  // =====================================

  function gerarHorarios(inicio, fim, duracao) {
    const [horaInicio, minutoInicio] = inicio
      .slice(0, 5)
      .split(':')
      .map(Number)

    const [horaFim, minutoFim] = fim
      .slice(0, 5)
      .split(':')
      .map(Number)

    let atual = horaInicio * 60 + minutoInicio
    const limite = horaFim * 60 + minutoFim

    const horarios = []

    while (atual + duracao <= limite) {
      const hora = Math.floor(atual / 60)
      const minuto = atual % 60

      horarios.push(
        `${String(hora).padStart(2, '0')}:${String(
          minuto
        ).padStart(2, '0')}`
      )

      atual += duracao
    }

    return horarios
  }

  function horarioParaMinutos(horario) {
    const [hora, minuto] = horario
      .slice(0, 5)
      .split(':')
      .map(Number)

    return hora * 60 + minuto
  }

  function horariosSeSobrepoem(
    inicioA,
    duracaoA,
    inicioB,
    duracaoB
  ) {
    const comecoA = horarioParaMinutos(inicioA)
    const fimA = comecoA + duracaoA

    const comecoB = horarioParaMinutos(inicioB)
    const fimB = comecoB + duracaoB

    return comecoA < fimB && fimA > comecoB
  }

  // =====================================
  // HORÁRIOS DISPONÍVEIS DO CLIENTE
  // =====================================

  useEffect(() => {
    async function carregarHorariosCliente() {
      setHorarioSelecionado('')
      setMensagem('')

      if (
        !barbeiroSelecionado ||
        !servicoSelecionado ||
        !dataSelecionada
      ) {
        setHorariosDisponiveis([])
        return
      }

      const data = new Date(`${dataSelecionada}T12:00:00`)
      const diaSemana = data.getDay()

      const {
        data: horarioTrabalho,
        error: erroHorario,
      } = await supabase
        .from('horarios_trabalho')
        .select('hora_inicio, hora_fim')
        .eq('barbeiro_id', barbeiroSelecionado.id)
        .eq('dia_semana', diaSemana)
        .eq('ativo', true)
        .maybeSingle()

      if (erroHorario || !horarioTrabalho) {
        setHorariosDisponiveis([])
        return
      }

      const {
        data: ocupadosBanco,
        error: erroOcupados,
      } = await supabase
        .from('agendamentos')
        .select(`
          horario,
          status,
          servico:servicos(
            duracao_minutos
          )
        `)
        .eq('barbeiro_id', barbeiroSelecionado.id)
        .eq('data', dataSelecionada)
        .neq('status', 'cancelado')

      if (erroOcupados) {
        console.log('Erro horários ocupados:', erroOcupados)
        setHorariosDisponiveis([])
        return
      }

      const {
        data: bloqueiosBanco,
        error: erroBloqueios,
      } = await supabase
        .from('bloqueios')
        .select('horario')
        .eq('barbeiro_id', barbeiroSelecionado.id)
        .eq('data', dataSelecionada)

      if (erroBloqueios) {
        console.log('Erro bloqueios:', erroBloqueios)
      }

      const diaInteiroBloqueado = (bloqueiosBanco || []).some(
        (item) => item.horario === null
      )

      if (diaInteiroBloqueado) {
        setHorariosDisponiveis([])
        return
      }

      let horarios = gerarHorarios(
        horarioTrabalho.hora_inicio,
        horarioTrabalho.hora_fim,
        servicoSelecionado.duracao_minutos
      )

      // Impede choque entre serviços com durações diferentes
      horarios = horarios.filter((horario) => {
        return !(ocupadosBanco || []).some((agendamento) => {
          const duracaoExistente = Number(
            agendamento.servico?.duracao_minutos || 45
          )

          return horariosSeSobrepoem(
            horario,
            Number(servicoSelecionado.duracao_minutos),
            agendamento.horario,
            duracaoExistente
          )
        })
      })

      // Bloqueios de horário
      const bloqueados = (bloqueiosBanco || [])
        .filter((item) => item.horario)
        .map((item) => item.horario.slice(0, 5))

      horarios = horarios.filter((horario) => {
        return !bloqueados.some((bloqueado) =>
          horariosSeSobrepoem(
            horario,
            Number(servicoSelecionado.duracao_minutos),
            bloqueado,
            45
          )
        )
      })

      // Não mostrar horários que já passaram hoje
      const agora = new Date()
      const hoje = formatarDataBanco(agora)

      if (dataSelecionada === hoje) {
        const minutosAgora =
          agora.getHours() * 60 + agora.getMinutes()

        horarios = horarios.filter(
          (horario) =>
            horarioParaMinutos(horario) > minutosAgora
        )
      }

      setHorariosDisponiveis(horarios)
    }

    carregarHorariosCliente()
  }, [
    barbeiroSelecionado,
    servicoSelecionado,
    dataSelecionada,
  ])

  // =====================================
  // CRIAR AGENDAMENTO
  // =====================================

  async function confirmarAgendamento() {
    setMensagem('')

    if (
      !barbeiroSelecionado ||
      !servicoSelecionado ||
      !dataSelecionada ||
      !horarioSelecionado ||
      !nomeCliente.trim() ||
      !telefoneCliente.trim()
    ) {
      setMensagem('⚠️ Preencha todas as informações.')
      return
    }

    setSalvando(true)

    const { error } = await supabase
      .from('agendamentos')
      .insert({
        barbeiro_id: barbeiroSelecionado.id,
        servico_id: servicoSelecionado.id,
        nome_cliente: nomeCliente.trim(),
        telefone_cliente: telefoneCliente.trim(),
        data: dataSelecionada,
        horario: `${horarioSelecionado}:00`,
      })

    setSalvando(false)

    if (error) {
      console.log(error)

      if (error.code === '23505') {
        setMensagem(
          '⚠️ Esse horário acabou de ser ocupado.'
        )
      } else {
        setMensagem(
          '❌ Não foi possível realizar o agendamento.'
        )
      }

      return
    }

    setMensagem('✅ Agendamento realizado com sucesso!')

    setHorariosDisponiveis((lista) =>
      lista.filter(
        (horario) => horario !== horarioSelecionado
      )
    )

    setHorarioSelecionado('')
    setNomeCliente('')
    setTelefoneCliente('')
  }

  // =====================================
  // LOGIN
  // =====================================

  async function fazerLogin() {
    setErroLogin('')

    if (!emailLogin.trim() || !senhaLogin) {
      setErroLogin('Digite seu e-mail e sua senha.')
      return
    }

    setEntrando(true)

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: emailLogin.trim(),
        password: senhaLogin,
      })

    if (error) {
      setEntrando(false)
      setErroLogin('E-mail ou senha incorretos.')
      return
    }

    const perfil = await carregarPerfilBarbeiro(
      data.user.id
    )

    if (!perfil) {
      await supabase.auth.signOut()

      setEntrando(false)

      setErroLogin(
        'Esta conta não está vinculada a um barbeiro.'
      )

      return
    }

    setEmailAtual(data.user.email || '')
    setSenhaLogin('')
    setEntrando(false)
    setPagina('painel')
  }

  // =====================================
  // PERFIL
  // =====================================

  async function carregarPerfilBarbeiro(userId) {
    const { data, error } = await supabase
      .from('barbeiros')
      .select('id, nome, user_id, ativo')
      .eq('user_id', userId)
      .eq('ativo', true)
      .maybeSingle()

    if (error || !data) {
      console.log('Erro perfil:', error)
      return null
    }

    setBarbeiroLogado(data)

    await carregarAgendamentos(data.id)

    return data
  }

  // =====================================
  // AGENDAMENTOS DO BARBEIRO
  // =====================================

  async function carregarAgendamentos(barbeiroId) {
    setCarregandoAgendamentos(true)

    const hoje = formatarDataBanco(new Date())

    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data,
        horario,
        status,
        nome_cliente,
        telefone_cliente,
        servico:servicos(
          nome,
          preco,
          duracao_minutos
        )
      `)
      .eq('barbeiro_id', barbeiroId)
      .gte('data', hoje)
      .order('data', { ascending: true })
      .order('horario', { ascending: true })

    if (error) {
      console.log(error)
      setAgendamentos([])
    } else {
      setAgendamentos(data || [])
    }

    setCarregandoAgendamentos(false)
  }

  async function atualizarStatusAgendamento(
    id,
    novoStatus
  ) {
    if (!barbeiroLogado) return

    if (novoStatus === 'cancelado') {
      const confirmar = window.confirm(
        'Tem certeza que deseja cancelar este agendamento?'
      )

      if (!confirmar) return
    }

    const { error } = await supabase
      .from('agendamentos')
      .update({
        status: novoStatus,
      })
      .eq('id', id)

    if (error) {
      console.log(error)

      setMensagemPainel(
        '❌ Não foi possível atualizar.'
      )

      return
    }

    if (novoStatus === 'confirmado') {
      setMensagemPainel('✅ Agendamento confirmado!')
    }

    if (novoStatus === 'cancelado') {
      setMensagemPainel(
        '✅ Agendamento cancelado e horário liberado.'
      )
    }

    await carregarAgendamentos(barbeiroLogado.id)
  }

  function nomeStatus(status) {
    if (status === 'confirmado') return 'Confirmado'
    if (status === 'cancelado') return 'Cancelado'

    return 'Agendado'
  }

  // =====================================
  // SERVIÇOS DO BARBEIRO LOGADO
  // =====================================

  async function carregarServicosAdmin() {
    if (!barbeiroLogado) return

    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('barbeiro_id', barbeiroLogado.id)
      .order('id')

    if (error) {
      console.log(error)
      setMensagemServicos(
        '❌ Não foi possível carregar seus serviços.'
      )
      return
    }

    const lista = data || []

    setServicosAdmin(lista)

    const edicoes = {}

    lista.forEach((servico) => {
      edicoes[servico.id] = {
        nome: servico.nome,
        preco: String(servico.preco),
        duracao: String(servico.duracao_minutos),
      }
    })

    setEdicoesServicos(edicoes)
  }

  async function adicionarServico() {
    setMensagemServicos('')

    if (!barbeiroLogado) return

    const preco = Number(
      novoServicoPreco.replace(',', '.')
    )

    const duracao = Number(novoServicoDuracao)

    if (
      !novoServicoNome.trim() ||
      !Number.isFinite(preco) ||
      preco <= 0 ||
      !Number.isInteger(duracao) ||
      duracao <= 0
    ) {
      setMensagemServicos(
        '⚠️ Preencha nome, preço e duração corretamente.'
      )

      return
    }

    const { error } = await supabase
      .from('servicos')
      .insert({
        barbeiro_id: barbeiroLogado.id,
        nome: novoServicoNome.trim(),
        preco,
        duracao_minutos: duracao,
        ativo: true,
      })

    if (error) {
      console.log(error)

      setMensagemServicos(
        '❌ Não foi possível adicionar o serviço.'
      )

      return
    }

    setNovoServicoNome('')
    setNovoServicoPreco('')
    setNovoServicoDuracao('45')

    setMensagemServicos(
      `✅ Serviço adicionado somente para ${barbeiroLogado.nome}!`
    )

    await carregarServicosAdmin()
  }

  function alterarEdicaoServico(id, campo, valor) {
    setEdicoesServicos((atual) => ({
      ...atual,

      [id]: {
        ...atual[id],
        [campo]: valor,
      },
    }))
  }

  async function salvarServico(id) {
    setMensagemServicos('')

    if (!barbeiroLogado) return

    const edicao = edicoesServicos[id]

    if (!edicao) return

    const preco = Number(
      String(edicao.preco).replace(',', '.')
    )

    const duracao = Number(edicao.duracao)

    if (
      !edicao.nome.trim() ||
      !Number.isFinite(preco) ||
      preco <= 0 ||
      !Number.isInteger(duracao) ||
      duracao <= 0
    ) {
      setMensagemServicos(
        '⚠️ Confira os dados do serviço.'
      )

      return
    }

    const { error } = await supabase
      .from('servicos')
      .update({
        nome: edicao.nome.trim(),
        preco,
        duracao_minutos: duracao,
      })
      .eq('id', id)
      .eq('barbeiro_id', barbeiroLogado.id)

    if (error) {
      console.log(error)

      setMensagemServicos(
        '❌ Não foi possível salvar.'
      )

      return
    }

    setMensagemServicos(
      `✅ Serviço do ${barbeiroLogado.nome} atualizado!`
    )

    await carregarServicosAdmin()
  }

  async function alternarServico(servico) {
    if (!barbeiroLogado) return

    const { error } = await supabase
      .from('servicos')
      .update({
        ativo: !servico.ativo,
      })
      .eq('id', servico.id)
      .eq('barbeiro_id', barbeiroLogado.id)

    if (error) {
      console.log(error)

      setMensagemServicos(
        '❌ Não foi possível alterar o serviço.'
      )

      return
    }

    setMensagemServicos(
      servico.ativo
        ? '✅ Serviço desativado.'
        : '✅ Serviço ativado.'
    )

    await carregarServicosAdmin()
  }

  // =====================================
  // BLOQUEIOS
  // =====================================

  async function carregarBloqueios(barbeiroId) {
    const hoje = formatarDataBanco(new Date())

    const { data, error } = await supabase
      .from('bloqueios')
      .select('*')
      .eq('barbeiro_id', barbeiroId)
      .gte('data', hoje)
      .order('data', { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setBloqueios(data || [])
  }

  useEffect(() => {
    async function carregarHorariosParaBloquear() {
      setHorarioBloqueio('')

      if (!barbeiroLogado || !dataBloqueio) {
        setHorariosBloqueio([])
        return
      }

      const data = new Date(
        `${dataBloqueio}T12:00:00`
      )

      const diaSemana = data.getDay()

      if (diaSemana === 0) {
        setHorariosBloqueio([])
        return
      }

      const { data: trabalho } = await supabase
        .from('horarios_trabalho')
        .select('hora_inicio, hora_fim')
        .eq('barbeiro_id', barbeiroLogado.id)
        .eq('dia_semana', diaSemana)
        .eq('ativo', true)
        .maybeSingle()

      if (!trabalho) {
        setHorariosBloqueio([])
        return
      }

      let horarios = gerarHorarios(
        trabalho.hora_inicio,
        trabalho.hora_fim,
        45
      )

      const bloqueadosNesseDia = bloqueios
        .filter(
          (item) =>
            item.data === dataBloqueio &&
            item.horario !== null
        )
        .map((item) =>
          item.horario.slice(0, 5)
        )

      horarios = horarios.filter(
        (horario) =>
          !bloqueadosNesseDia.includes(horario)
      )

      setHorariosBloqueio(horarios)
    }

    carregarHorariosParaBloquear()
  }, [
    dataBloqueio,
    barbeiroLogado,
    bloqueios,
  ])

  async function bloquearDiaInteiro() {
    setMensagemBloqueio('')

    if (!barbeiroLogado || !dataBloqueio) {
      setMensagemBloqueio(
        '⚠️ Escolha uma data.'
      )

      return
    }

    const { error } = await supabase
      .from('bloqueios')
      .insert({
        barbeiro_id: barbeiroLogado.id,
        data: dataBloqueio,
        horario: null,
        motivo:
          motivoBloqueio.trim() ||
          'Dia bloqueado',
      })

    if (error) {
      if (error.code === '23505') {
        setMensagemBloqueio(
          '⚠️ Esse dia já está bloqueado.'
        )
      } else {
        console.log(error)

        setMensagemBloqueio(
          '❌ Não foi possível bloquear.'
        )
      }

      return
    }

    setMensagemBloqueio(
      '✅ Dia inteiro bloqueado!'
    )

    setMotivoBloqueio('')

    await carregarBloqueios(
      barbeiroLogado.id
    )
  }

  async function bloquearHorario() {
    setMensagemBloqueio('')

    if (
      !barbeiroLogado ||
      !dataBloqueio ||
      !horarioBloqueio
    ) {
      setMensagemBloqueio(
        '⚠️ Escolha a data e o horário.'
      )

      return
    }

    const diaJaBloqueado = bloqueios.some(
      (item) =>
        item.data === dataBloqueio &&
        item.horario === null
    )

    if (diaJaBloqueado) {
      setMensagemBloqueio(
        '⚠️ Esse dia já está bloqueado inteiro.'
      )

      return
    }

    const { error } = await supabase
      .from('bloqueios')
      .insert({
        barbeiro_id: barbeiroLogado.id,
        data: dataBloqueio,
        horario: `${horarioBloqueio}:00`,
        motivo:
          motivoBloqueio.trim() ||
          'Horário bloqueado',
      })

    if (error) {
      if (error.code === '23505') {
        setMensagemBloqueio(
          '⚠️ Esse horário já está bloqueado.'
        )
      } else {
        console.log(error)

        setMensagemBloqueio(
          '❌ Não foi possível bloquear.'
        )
      }

      return
    }

    setMensagemBloqueio(
      '✅ Horário bloqueado!'
    )

    setHorarioBloqueio('')
    setMotivoBloqueio('')

    await carregarBloqueios(
      barbeiroLogado.id
    )
  }

  async function desbloquear(id) {
    const confirmar = window.confirm(
      'Deseja desbloquear este dia/horário?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('bloqueios')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)

      setMensagemBloqueio(
        '❌ Não foi possível desbloquear.'
      )

      return
    }

    setMensagemBloqueio(
      '✅ Dia/horário desbloqueado!'
    )

    await carregarBloqueios(
      barbeiroLogado.id
    )
  }

  // =====================================
  // ALTERAR E-MAIL
  // =====================================

  async function alterarEmail() {
    setMensagemConta('')

    const emailNovo = novoEmail
      .trim()
      .toLowerCase()

    if (
      !emailNovo ||
      !emailNovo.includes('@')
    ) {
      setMensagemConta(
        '⚠️ Digite um e-mail válido.'
      )

      return
    }

    if (
      emailNovo ===
      emailAtual.toLowerCase()
    ) {
      setMensagemConta(
        '⚠️ Esse já é o seu e-mail atual.'
      )

      return
    }

    const { data, error } =
      await supabase.auth.updateUser({
        email: emailNovo,
      })

    if (error) {
      console.log('Erro ao trocar e-mail:', error)

      setMensagemConta(
        `❌ Não foi possível alterar: ${error.message}`
      )

      return
    }

    setEmailPendente(emailNovo)
    setNovoEmail('')

    // Se a configuração do projeto permitir troca imediata
    if (
      data?.user?.email &&
      data.user.email.toLowerCase() ===
        emailNovo
    ) {
      setEmailAtual(data.user.email)
      setEmailPendente('')

      setMensagemConta(
        '✅ E-mail alterado com sucesso!'
      )

      return
    }

    setMensagemConta(
      `📧 Solicitação enviada para ${emailNovo}. Confirme a alteração pelo e-mail.`
    )
  }

  // =====================================
  // ALTERAR SENHA
  // =====================================

  async function alterarSenha() {
    setMensagemConta('')

    if (novaSenha.length < 8) {
      setMensagemConta(
        '⚠️ Use uma senha com pelo menos 8 caracteres.'
      )

      return
    }

    const { error } =
      await supabase.auth.updateUser({
        password: novaSenha,
      })

    if (error) {
      setMensagemConta(
        `❌ ${error.message}`
      )

      return
    }

    setMensagemConta(
      '✅ Senha alterada com sucesso!'
    )

    setNovaSenha('')
  }

  // =====================================
  // SAIR
  // =====================================

  async function sair() {
    await supabase.auth.signOut()

    setBarbeiroLogado(null)
    setAgendamentos([])
    setEmailLogin('')
    setSenhaLogin('')
    setPagina('inicio')
  }

  // =====================================
  // ADMIN DE SERVIÇOS
  // =====================================

  if (
    pagina === 'servicos-admin' &&
    barbeiroLogado
  ) {
    return (
      <div className="app cliente-app">
        <div className="card card-agendamento">
          <div className="logo">✂️</div>

          <h1>Meus serviços</h1>

          <p className="subtitulo">
            Serviços de {barbeiroLogado.nome}
          </p>

          <section className="admin-secao">
            <h2>➕ Novo serviço</h2>

            <div className="admin-form">
              <input
                type="text"
                placeholder="Nome do serviço"
                value={novoServicoNome}
                onChange={(e) =>
                  setNovoServicoNome(
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Preço"
                value={novoServicoPreco}
                onChange={(e) =>
                  setNovoServicoPreco(
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                placeholder="Duração em minutos"
                value={novoServicoDuracao}
                onChange={(e) =>
                  setNovoServicoDuracao(
                    e.target.value
                  )
                }
              />

              <button
                className="botao-principal"
                onClick={adicionarServico}
              >
                ➕ Adicionar serviço
              </button>
            </div>
          </section>

          <section className="admin-secao">
            <h2>✂️ Meus serviços</h2>

            {servicosAdmin.length === 0 ? (
              <p className="sem-horario">
                Nenhum serviço cadastrado.
              </p>
            ) : (
              <div className="servicos-admin-lista">
                {servicosAdmin.map((servico) => (
                  <div
                    className="servico-admin-card"
                    key={servico.id}
                  >
                    <div className="status-servico">
                      {servico.ativo
                        ? '🟢 Ativo'
                        : '🔴 Desativado'}
                    </div>

                    <label>Serviço</label>

                    <input
                      type="text"
                      value={
                        edicoesServicos[
                          servico.id
                        ]?.nome || ''
                      }
                      onChange={(e) =>
                        alterarEdicaoServico(
                          servico.id,
                          'nome',
                          e.target.value
                        )
                      }
                    />

                    <label>Preço (R$)</label>

                    <input
                      type="text"
                      value={
                        edicoesServicos[
                          servico.id
                        ]?.preco || ''
                      }
                      onChange={(e) =>
                        alterarEdicaoServico(
                          servico.id,
                          'preco',
                          e.target.value
                        )
                      }
                    />

                    <label>
                      Duração em minutos
                    </label>

                    <input
                      type="number"
                      value={
                        edicoesServicos[
                          servico.id
                        ]?.duracao || ''
                      }
                      onChange={(e) =>
                        alterarEdicaoServico(
                          servico.id,
                          'duracao',
                          e.target.value
                        )
                      }
                    />

                    <div className="admin-botoes">
                      <button
                        className="botao-salvar"
                        onClick={() =>
                          salvarServico(
                            servico.id
                          )
                        }
                      >
                        💾 Salvar
                      </button>

                      <button
                        className={
                          servico.ativo
                            ? 'botao-desativar'
                            : 'botao-ativar'
                        }
                        onClick={() =>
                          alternarServico(
                            servico
                          )
                        }
                      >
                        {servico.ativo
                          ? '👁️ Desativar'
                          : '👁️ Ativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {mensagemServicos && (
            <p className="mensagem">
              {mensagemServicos}
            </p>
          )}

          <button
            className="botao-secundario"
            onClick={() =>
              setPagina('painel')
            }
          >
            ← Voltar ao painel
          </button>
        </div>
      </div>
    )
  }

  // =====================================
  // BLOQUEAR AGENDA
  // =====================================

  if (
    pagina === 'bloqueios-admin' &&
    barbeiroLogado
  ) {
    return (
      <div className="app cliente-app">
        <div className="card card-agendamento">
          <div className="logo">📅</div>

          <h1>Bloquear agenda</h1>

          <p className="subtitulo">
            {barbeiroLogado.nome}
          </p>

          <section className="admin-secao">
            <h2>Escolha a data</h2>

            <input
              type="date"
              min={formatarDataBanco(
                new Date()
              )}
              value={dataBloqueio}
              onChange={(e) =>
                setDataBloqueio(
                  e.target.value
                )
              }
            />

            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={motivoBloqueio}
              onChange={(e) =>
                setMotivoBloqueio(
                  e.target.value
                )
              }
            />

            <button
              className="botao-bloquear-dia"
              onClick={bloquearDiaInteiro}
            >
              📅 Bloquear dia inteiro
            </button>
          </section>

          {dataBloqueio && (
            <section className="admin-secao">
              <h2>
                🕐 Bloquear horário específico
              </h2>

              {horariosBloqueio.length === 0 ? (
                <p className="sem-horario">
                  Nenhum horário disponível.
                </p>
              ) : (
                <div className="horarios-grid">
                  {horariosBloqueio.map(
                    (horario) => (
                      <button
                        key={horario}
                        className={
                          horarioBloqueio ===
                          horario
                            ? 'horario horario-selecionado'
                            : 'horario'
                        }
                        onClick={() =>
                          setHorarioBloqueio(
                            horario
                          )
                        }
                      >
                        {horario}
                      </button>
                    )
                  )}
                </div>
              )}

              {horarioBloqueio && (
                <button
                  className="botao-bloquear-horario"
                  onClick={bloquearHorario}
                >
                  🚫 Bloquear{' '}
                  {horarioBloqueio}
                </button>
              )}
            </section>
          )}

          <section className="admin-secao">
            <h2>🔒 Meus bloqueios</h2>

            {bloqueios.length === 0 ? (
              <p className="sem-horario">
                Nenhum bloqueio.
              </p>
            ) : (
              <div className="bloqueios-lista">
                {bloqueios.map(
                  (bloqueio) => (
                    <div
                      className="bloqueio-card"
                      key={bloqueio.id}
                    >
                      <div>
                        <strong>
                          📅{' '}
                          {formatarDataExibicao(
                            bloqueio.data
                          )}
                        </strong>

                        <p>
                          {bloqueio.horario
                            ? `🕐 ${bloqueio.horario.slice(
                                0,
                                5
                              )}`
                            : '🚫 Dia inteiro'}
                        </p>

                        <small>
                          {bloqueio.motivo}
                        </small>
                      </div>

                      <button
                        className="botao-desbloquear"
                        onClick={() =>
                          desbloquear(
                            bloqueio.id
                          )
                        }
                      >
                        🔓 Desbloquear
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {mensagemBloqueio && (
            <p className="mensagem">
              {mensagemBloqueio}
            </p>
          )}

          <button
            className="botao-secundario"
            onClick={() =>
              setPagina('painel')
            }
          >
            ← Voltar ao painel
          </button>
        </div>
      </div>
    )
  }

  // =====================================
  // CONFIGURAÇÕES
  // =====================================

  if (
    pagina === 'configuracoes' &&
    barbeiroLogado
  ) {
    return (
      <div className="app">
        <div className="card">
          <div className="logo">⚙️</div>

          <h1>Configurações</h1>

          <p className="subtitulo">
            {barbeiroLogado.nome}
          </p>

          <div className="config-box">
            <h3>📧 Alterar e-mail</h3>

            <p>
              E-mail atual:
              <br />
              <strong>
                {emailAtual}
              </strong>
            </p>

            {emailPendente && (
              <p className="mensagem">
                ⏳ Aguardando confirmação:
                <br />
                <strong>
                  {emailPendente}
                </strong>
              </p>
            )}

            <input
              type="email"
              placeholder="Digite o novo e-mail"
              value={novoEmail}
              onChange={(e) =>
                setNovoEmail(
                  e.target.value
                )
              }
            />

            <button
              className="botao-principal"
              onClick={alterarEmail}
            >
              📧 Alterar e-mail
            </button>
          </div>

          <div className="config-box">
            <h3>🔐 Alterar senha</h3>

            <input
              type="password"
              placeholder="Nova senha"
              value={novaSenha}
              onChange={(e) =>
                setNovaSenha(
                  e.target.value
                )
              }
            />

            <button
              className="botao-principal"
              onClick={alterarSenha}
            >
              🔐 Alterar senha
            </button>
          </div>

          {mensagemConta && (
            <p className="mensagem">
              {mensagemConta}
            </p>
          )}

          <button
            className="botao-secundario"
            onClick={() =>
              setPagina('painel')
            }
          >
            ← Voltar ao painel
          </button>
        </div>
      </div>
    )
  }

  // =====================================
  // PAINEL
  // =====================================

  if (
    pagina === 'painel' &&
    barbeiroLogado
  ) {
    return (
      <div className="app cliente-app">
        <div className="card card-agendamento">
          <div className="logo">💈</div>

          <h1>Bielcorts</h1>

          <h2>
            Olá, {barbeiroLogado.nome}!
          </h2>

          <p className="subtitulo">
            {emailAtual}
          </p>

          <div className="painel-menu">
            <button
              className="botao-menu-painel"
              onClick={async () => {
                setMensagemServicos('')

                await carregarServicosAdmin()

                setPagina(
                  'servicos-admin'
                )
              }}
            >
              ✂️
              <span>
                Meus serviços
              </span>
            </button>

            <button
              className="botao-menu-painel"
              onClick={async () => {
                setMensagemBloqueio('')

                await carregarBloqueios(
                  barbeiroLogado.id
                )

                setPagina(
                  'bloqueios-admin'
                )
              }}
            >
              📅
              <span>
                Bloquear agenda
              </span>
            </button>

            <button
              className="botao-menu-painel"
              onClick={() => {
                setMensagemConta('')

                setPagina(
                  'configuracoes'
                )
              }}
            >
              ⚙️
              <span>
                Configurações
              </span>
            </button>

            <button
              className="botao-menu-painel"
              onClick={() =>
                carregarAgendamentos(
                  barbeiroLogado.id
                )
              }
            >
              🔄
              <span>Atualizar</span>
            </button>
          </div>

          {mensagemPainel && (
            <p className="mensagem">
              {mensagemPainel}
            </p>
          )}

          <section className="etapa">
            <div className="titulo-etapa">
              <span>📅</span>

              <h2>
                Próximos agendamentos
              </h2>
            </div>

            {carregandoAgendamentos ? (
              <p>Carregando...</p>
            ) : agendamentos.length === 0 ? (
              <p className="sem-horario">
                Nenhum agendamento.
              </p>
            ) : (
              <div className="agendamentos-lista">
                {agendamentos.map(
                  (agendamento) => (
                    <div
                      className="agendamento-card"
                      key={agendamento.id}
                    >
                      <div className="agendamento-data">
                        <strong>
                          📅{' '}
                          {formatarDataExibicao(
                            agendamento.data
                          )}
                        </strong>

                        <strong>
                          🕐{' '}
                          {agendamento.horario.slice(
                            0,
                            5
                          )}
                        </strong>
                      </div>

                      <h3>
                        👤{' '}
                        {
                          agendamento.nome_cliente
                        }
                      </h3>

                      <p>
                        📱{' '}
                        {
                          agendamento.telefone_cliente
                        }
                      </p>

                      <p>
                        ✂️{' '}
                        {agendamento.servico
                          ?.nome ||
                          'Serviço'}
                      </p>

                      <p>
                        💰 R${' '}
                        {Number(
                          agendamento.servico
                            ?.preco || 0
                        ).toFixed(2)}
                      </p>

                      <span
                        className={`status status-${agendamento.status}`}
                      >
                        {nomeStatus(
                          agendamento.status
                        )}
                      </span>

                      {agendamento.status !==
                        'cancelado' && (
                        <div className="acoes-agendamento">
                          {agendamento.status !==
                            'confirmado' && (
                            <button
                              className="botao-confirmar-agendamento"
                              onClick={() =>
                                atualizarStatusAgendamento(
                                  agendamento.id,
                                  'confirmado'
                                )
                              }
                            >
                              ✅ Confirmar
                            </button>
                          )}

                          <button
                            className="botao-cancelar-agendamento"
                            onClick={() =>
                              atualizarStatusAgendamento(
                                agendamento.id,
                                'cancelado'
                              )
                            }
                          >
                            ❌ Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <button
            className="botao-secundario"
            onClick={sair}
          >
            🚪 Sair
          </button>
        </div>
      </div>
    )
  }

  // =====================================
  // LOGIN
  // =====================================

  if (pagina === 'barbeiro') {
    return (
      <div className="app">
        <div className="card">
          <div className="logo">💈</div>

          <h1>Bielcorts</h1>

          <h2>Acesso do Barbeiro</h2>

          <div className="login-box">
            <input
              type="email"
              placeholder="E-mail"
              value={emailLogin}
              onChange={(e) =>
                setEmailLogin(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaLogin}
              onChange={(e) =>
                setSenhaLogin(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter'
                ) {
                  fazerLogin()
                }
              }}
            />

            <button
              onClick={fazerLogin}
              disabled={entrando}
            >
              {entrando
                ? 'Entrando...'
                : '🔐 Entrar'}
            </button>
          </div>

          {erroLogin && (
            <p className="mensagem erro">
              {erroLogin}
            </p>
          )}

          <button
            className="botao-secundario"
            onClick={() =>
              setPagina('inicio')
            }
          >
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  // =====================================
  // CLIENTE
  // =====================================

  if (pagina === 'cliente') {
    return (
      <div className="app cliente-app">
        <div className="card card-agendamento">
          <div className="logo">💈</div>

          <h1>Bielcorts</h1>

          <p className="subtitulo">
            Agende seu horário
          </p>

          {carregando ? (
            <p>Carregando...</p>
          ) : (
            <>
              <section className="etapa">
                <div className="titulo-etapa">
                  <span>1</span>
                  <h2>Escolha o barbeiro</h2>
                </div>

                <div className="opcoes-grid">
                  {barbeiros.map(
                    (item) => (
                      <button
                        key={item.id}
                        className={
                          barbeiroSelecionado
                            ?.id ===
                          item.id
                            ? 'opcao selecionado'
                            : 'opcao'
                        }
                        onClick={() => {
                          setBarbeiroSelecionado(
                            item
                          )

                          setServicoSelecionado(
                            null
                          )

                          setServicos([])

                          setDataSelecionada(
                            ''
                          )

                          setHorarioSelecionado(
                            ''
                          )

                          setMensagem('')
                        }}
                      >
                        💈 {item.nome}
                      </button>
                    )
                  )}
                </div>
              </section>

              {barbeiroSelecionado && (
                <section className="etapa">
                  <div className="titulo-etapa">
                    <span>2</span>
                    <h2>
                      Serviços de{' '}
                      {
                        barbeiroSelecionado.nome
                      }
                    </h2>
                  </div>

                  {carregandoServicos ? (
                    <p>
                      Carregando serviços...
                    </p>
                  ) : servicos.length === 0 ? (
                    <p className="sem-horario">
                      Esse barbeiro não possui
                      serviços disponíveis.
                    </p>
                  ) : (
                    <div className="servicos-grid">
                      {servicos.map(
                        (servico) => (
                          <button
                            key={
                              servico.id
                            }
                            className={
                              servicoSelecionado
                                ?.id ===
                              servico.id
                                ? 'servico selecionado'
                                : 'servico'
                            }
                            onClick={() => {
                              setServicoSelecionado(
                                servico
                              )

                              setDataSelecionada(
                                ''
                              )

                              setHorarioSelecionado(
                                ''
                              )
                            }}
                          >
                            <strong>
                              ✂️{' '}
                              {
                                servico.nome
                              }
                            </strong>

                            <span>
                              R${' '}
                              {Number(
                                servico.preco
                              ).toFixed(2)}
                            </span>

                            <small>
                              ⏱️{' '}
                              {
                                servico.duracao_minutos
                              }{' '}
                              min
                            </small>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}

              {servicoSelecionado && (
                <section className="etapa">
                  <div className="titulo-etapa">
                    <span>3</span>
                    <h2>Escolha o dia</h2>
                  </div>

                  <div className="calendario">
                    {gerarDias().map(
                      (dia) => (
                        <button
                          key={
                            dia.valor
                          }
                          className={
                            dataSelecionada ===
                            dia.valor
                              ? 'dia-calendario dia-selecionado'
                              : 'dia-calendario'
                          }
                          onClick={() =>
                            setDataSelecionada(
                              dia.valor
                            )
                          }
                        >
                          <span className="dia-semana">
                            {
                              dia.diaSemana
                            }
                          </span>

                          <strong className="numero-dia">
                            {dia.numero}
                          </strong>

                          <span className="mes-dia">
                            {dia.mes}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </section>
              )}

              {dataSelecionada && (
                <section className="etapa">
                  <div className="titulo-etapa">
                    <span>4</span>
                    <h2>Escolha o horário</h2>
                  </div>

                  {horariosDisponiveis.length ===
                  0 ? (
                    <p className="sem-horario">
                      Nenhum horário disponível.
                    </p>
                  ) : (
                    <div className="horarios-grid">
                      {horariosDisponiveis.map(
                        (horario) => (
                          <button
                            key={
                              horario
                            }
                            className={
                              horarioSelecionado ===
                              horario
                                ? 'horario horario-selecionado'
                                : 'horario'
                            }
                            onClick={() =>
                              setHorarioSelecionado(
                                horario
                              )
                            }
                          >
                            {horario}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}

              {horarioSelecionado && (
                <section className="etapa">
                  <div className="titulo-etapa">
                    <span>5</span>
                    <h2>Seus dados</h2>
                  </div>

                  <div className="formulario">
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={nomeCliente}
                      onChange={(e) =>
                        setNomeCliente(
                          e.target.value
                        )
                      }
                    />

                    <input
                      type="tel"
                      placeholder="Telefone / WhatsApp"
                      value={
                        telefoneCliente
                      }
                      onChange={(e) =>
                        setTelefoneCliente(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="resumo">
                    <h3>
                      Resumo do agendamento
                    </h3>

                    <p>
                      💈{' '}
                      {
                        barbeiroSelecionado.nome
                      }
                    </p>

                    <p>
                      ✂️{' '}
                      {
                        servicoSelecionado.nome
                      }
                    </p>

                    <p>
                      💰 R${' '}
                      {Number(
                        servicoSelecionado.preco
                      ).toFixed(2)}
                    </p>

                    <p>
                      ⏱️{' '}
                      {
                        servicoSelecionado.duracao_minutos
                      }{' '}
                      minutos
                    </p>

                    <p>
                      📅{' '}
                      {formatarDataExibicao(
                        dataSelecionada
                      )}
                    </p>

                    <p>
                      🕐{' '}
                      {
                        horarioSelecionado
                      }
                    </p>
                  </div>

                  <button
                    className="confirmar"
                    disabled={salvando}
                    onClick={
                      confirmarAgendamento
                    }
                  >
                    {salvando
                      ? 'Agendando...'
                      : '✅ Confirmar agendamento'}
                  </button>
                </section>
              )}

              {mensagem && (
                <p className="mensagem">
                  {mensagem}
                </p>
              )}
            </>
          )}

          <button
            className="botao-secundario"
            onClick={() => {
              setPagina('inicio')
              setBarbeiroSelecionado(null)
              setServicoSelecionado(null)
              setServicos([])
              setDataSelecionada('')
              setHorarioSelecionado('')
            }}
          >
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  // =====================================
  // INÍCIO
  // =====================================

  return (
    <div className="app">
      <div className="card inicio-card">
        <div className="logo-grande">
          💈
        </div>

        <h1>Bielcorts</h1>

        <p className="subtitulo">
          Seu estilo, seu horário.
        </p>

        <div className="linha"></div>

        <h2>Como deseja acessar?</h2>

        <button
          className="botao-principal"
          onClick={() =>
            setPagina('cliente')
          }
        >
          👤 Entrar como Cliente
        </button>

        <button
          className="botao-principal"
          onClick={() =>
            setPagina('barbeiro')
          }
        >
          💈 Entrar como Barbeiro
        </button>
      </div>
    </div>
  )
}

export default App