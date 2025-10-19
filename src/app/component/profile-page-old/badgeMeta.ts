export const BADGE_META: Record<string, { title: string, description: string, icon: string }> = {
  bughunter: {
    title: 'Ловитель багов',
    description: 'Нашёл баги на сайте',
    icon: 'Bug'
  },
  olduser: {
    title: 'Олд сайта',
    description: 'С нами с самого начала',
    icon: 'Cat'
  },
  administrator: {
    title: 'Администрация сайта',
    description: 'Люди, которые следят за сайтом',
    icon: 'Shield'
  },
  adminstagelater: {
    title: 'Старший админ',
    description: 'За долгую стажировку на сайте',
    icon: 'ShieldPlus' // ТУТ СДЕЛАТЬ ИКОНКУ ЩИТА, НО ЖЕЛТУЮ
  },
  premium: {
    title: 'Премиум пользователь',
    description: 'Поддержал проект',
    icon: 'Star'
  },
  activityuser: {
    title: 'Активный пользователь',
    description: 'Часто заходит на сайт',
    icon: 'Coffee'
  },
  helping: {
    title: 'Помогает проекту',
    description: 'Вносит вклад в развитие',
    icon: 'HelpingHand'
  }
};
