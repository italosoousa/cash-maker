/**
 * Mapa de palavras-chave → nome da categoria padrão.
 * PT + EN. Case-insensitive na hora do match.
 *
 * Ordem importa: a primeira categoria que der match vence.
 * Manter os arrays de maior para menor especificidade.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {

  Alimentação: [
    // apps de delivery
    'ifood', 'ifd*', 'rappi', 'uber eats', 'james delivery',
    // fast-food / redes
    'mcdonalds', 'mc donalds', "mcdonald's", 'subway', 'burger king', 'outback',
    'spoleto', 'giraffas', 'bahamas', 'habib', 'bob\'s', 'bobs ',
    'divino fogao', 'divino fogão', 'divino',
    // cafeterias / padarias / doces
    'padaria', 'panificadora', 'cafe ', 'café ', 'cafeteria', 'confeitaria',
    'sorveteria', 'yogoberry', 'acai', 'açaí',
    // estabelecimentos genéricos
    'restaurante', 'lanchonete', 'churrascaria', 'pizzaria', 'sushi', 'japonês',
    'comida caseira', 'comida', 'tia fa', 'quiosque', 'nacao beach', 'cande ',
    // supermercados / atacados
    'supermercado', 'mercado', 'atacadista', 'hortifruti', 'feira', 'açougue',
    'adega ', 'superadega', 'ultra adega',
    // EN
    'restaurant', 'grocery', 'supermarket', 'bakery', 'butcher', 'deli',
    'pizza', 'burger', 'food', 'meal', 'lunch', 'dinner', 'snack', 'coffee',
  ],

  Transporte: [
    // combustível
    'combustivel', 'combustível', 'gasolina', 'etanol', 'alcool', 'álcool',
    'cascol', 'ipiranga', 'shell ', 'petrobras', 'posto ', 'auto posto',
    'posto garantia',
    // estacionamento
    'estacionamento', 'estac ', 'allpark', 'shoppingpark', 'park ',
    // apps / táxi
    'uber ', '99app', '99 ', 'cabify', 'turbi', 'yellow ',
    // transporte público
    'metrô', 'metro ', 'onibus', 'ônibus', 'passagem', 'bilhete', 'brt ',
    'transporte', 'pedagio', 'pedágio',
    // EN
    'fuel', 'gas station', 'parking', 'toll', 'transit', 'bus', 'subway',
    'taxi', 'rideshare',
  ],

  Saúde: [
    // farmácias
    'farmacia', 'farmácia', 'drogaria', 'drogasil', 'droga raia', 'raia ',
    'ultrafarma', 'pacheco', 'nissei', 'pague menos', 'ultragenix',
    // planos / hospitais
    'hospital', 'clinica', 'clínica', 'pronto socorro', 'upa ', 'sus ',
    'unimed', 'amil', 'hapvida', 'sulamerica saude', 'bradesco saude',
    'notredame', 'plano de saude',
    // consultas / exames
    'médico', 'medico', 'consulta', 'exame', 'laboratorio', 'laboratório',
    'diagnostico', 'diagnóstico', 'ultrassom', 'raio x',
    // especialidades
    'dentista', 'odonto', 'fisioterapia', 'psicólogo', 'psicologo',
    'nutricionista', 'ortopedia', 'oftalmologia',
    // fitness
    'academia', 'smartfit', 'bluefit', 'bodytech', 'crossfit', 'pilates',
    'gym', 'fitness',
    // marcas do CSV
    'base hospitalar', 'vida medical', 'helphbo', 'helphbom',
    // EN
    'pharmacy', 'drugstore', 'hospital', 'clinic', 'doctor', 'medical',
    'health', 'dental', 'therapy', 'medicine',
  ],

  Lazer: [
    // streaming
    'netflix', 'spotify', 'amazon prime', 'amazonprimebr', 'hbo max', 'hbomax',
    'disney plus', 'disneyplus', 'youtube premium', 'twitch', 'crunchyroll',
    'deezer', 'apple music', 'applecombill',
    // games
    'steam ', 'playstation', 'xbox ', 'nintendo', 'epic games', 'riot games',
    'blizzard', 'ubisoft',
    // viagens / hotel
    'hotel ', 'pousada', 'resort', 'airbnb', 'booking', 'decolar',
    'royal tulip', 'ibis ', 'holiday inn',
    // entretenimento
    'cinema', 'cineflix', 'cinemark', 'kinoplex', 'moviecom',
    'teatro', 'show ', 'evento ', 'ingresso', 'sympla', 'ticketmaster',
    // turismo / lazer
    'parque', 'club ', 'clube ', 'viagem', 'passeio', 'praia',
    // assinaturas / tech entertainment
    'microsoft*subscription', 'microsoft subscription',
    // EN
    'entertainment', 'movie', 'concert', 'ticket', 'travel', 'beach',
    'leisure', 'game', 'sport',
  ],

  Educação: [
    // plataformas online
    'cursor ', 'cursor ai', 'udemy', 'coursera', 'duolingo', 'babbel',
    'alura', 'rocketseat', 'descomplica', 'hotmart', 'eduzz', 'kiwify',
    'skillshare', 'linkedin learning',
    // artes marciais / esportes educacionais
    'gfteam', 'gracie', 'bjj', 'jiu jitsu', 'judo', 'karate',
    // escolas / universidades
    'escola', 'faculdade', 'universidade', 'college', 'colégio',
    'mensalidade', 'matrícula', 'matricula', 'material escolar',
    // livros / papelaria
    'livraria', 'amazon livros', 'saraiva', 'cultura ', 'papelaria',
    // cursos
    'curso ', 'workshop', 'treinamento', 'capacitacao', 'capacitação',
    // EN
    'school', 'university', 'education', 'learning', 'training', 'lesson',
    'class ', 'course ', 'book ',
  ],

  Moradia: [
    // contas de casa
    'aluguel', 'condominio', 'condomínio', 'iptu', 'ipva',
    // energia / água / gás
    'neoenergia', 'copel', 'cemig', 'celpe', 'coelba', 'energisa',
    'sabesp', 'caesb', 'embasa', 'sanepar', 'comgas', 'gas natural',
    // telefone / internet
    'vivo ', 'claro ', 'tim ', 'oi ', 'net ', 'sky ', 'starlink',
    'internet', 'banda larga',
    // manutenção
    'manutencao', 'manutenção', 'reforma', 'pintura', 'eletricista',
    'encanador', 'pedreiro', 'marceneiro',
    // limpeza
    'limpeza', 'faxina', 'lavanderia',
    // EN
    'rent', 'condo', 'electricity', 'water', 'utilities', 'maintenance',
    'cleaning', 'repair', 'internet', 'phone',
  ],

  Compras: [
    // e-commerce
    'mercadolivre', 'mercadol', 'amazon ', 'shopee', 'aliexpress', 'shein',
    'americanas', 'casas bahia', 'extra ', 'magalu', 'magazine luiza',
    // moda
    'nike', 'adidas', 'fisia nike', 'renner', 'riachuelo', 'zara ', 'hm ',
    'h&m', 'cia maritima', 'lupo ', 'puma ',
    // eletrônicos
    'apple store', 'samsung', 'positivo', 'kabum', 'pichau', 'terabyte',
    // outras lojas
    'shopping ', 'loja ', 'lojas ',
    // EN
    'store', 'shop', 'clothing', 'electronics', 'retail', 'fashion',
  ],
}

/** Palavras que indicam que a linha é um PAGAMENTO da fatura (não importar como despesa) */
export const PAYMENT_KEYWORDS = [
  'pagamento recebido',
  'payment received',
  'pagamento de fatura',
  'credito',
  'crédito em conta',
  'estorno',
  'refund',
  'cashback',
  'devolucao',
  'devolução',
]
