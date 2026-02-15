const path = require('path');

const { createDbConnection } = require('./config/db');
const { createUpload } = require('./config/upload');
const { fotosHabitaciones } = require('./data/fotosHabitaciones');

const { createUsersRepo } = require('./repositories/usersRepo');
const { createReservasRepo } = require('./repositories/reservasRepo');
const { createHabitacionesRepo } = require('./repositories/habitacionesRepo');
const { createHabitacionFotosRepo } = require('./repositories/habitacionFotosRepo');
const { createHotelesRepo } = require('./repositories/hotelesRepo');
const { createUserWalletsRepo } = require('./repositories/userWalletsRepo');
const { createReviewsRepo } = require('./repositories/reviewsRepo');
const { createUserPreferencesRepo } = require('./repositories/userPreferencesRepo');
const { createUserEventsRepo } = require('./repositories/userEventsRepo');

const { createAuthService } = require('./services/authService');
const { createReservasService } = require('./services/reservasService');
const { createReservaLegacyService } = require('./services/reservaLegacyService');
const { createHabitacionesService } = require('./services/habitacionesService');
const { createHabitacionFotosService } = require('./services/habitacionFotosService');
const { createHotelesService } = require('./services/hotelesService');
const { createRatesService } = require('./services/ratesService');
const { createWeb3ConfigService } = require('./services/web3ConfigService');
const { createPaymentService } = require('./services/paymentService');
const { createChatbotService } = require('./services/chatbotService');
const { createUserWalletsService } = require('./services/userWalletsService');
const { createReviewsService } = require('./services/reviewsService');
const { createUserPreferencesService } = require('./services/userPreferencesService');
const { createRecommendationsService } = require('./services/recommendationsService');

const { createAuthController } = require('./controllers/authController');
const { createReservasController } = require('./controllers/reservasController');
const { createHabitacionesController } = require('./controllers/habitacionesController');
const { createHabitacionFotosController } = require('./controllers/habitacionFotosController');
const { createHotelesController } = require('./controllers/hotelesController');
const { createRatesController } = require('./controllers/ratesController');
const { createWeb3Controller } = require('./controllers/web3Controller');
const { createChatbotController } = require('./controllers/chatbotController');
const { createMeController } = require('./controllers/meController');
const { createReviewsController } = require('./controllers/reviewsController');
const { createPreferencesController } = require('./controllers/preferencesController');
const { createEventsController } = require('./controllers/eventsController');
const { createRecommendationsController } = require('./controllers/recommendationsController');

function bootstrap() {
  const db = createDbConnection({
    host: 'localhost',
    user: 'root',
    password: 'sasa',
    database: 'hotel_db'
  });

  // repos
  const usersRepo = createUsersRepo(db);
  const reservasRepo = createReservasRepo(db);
  const habitacionesRepo = createHabitacionesRepo(db);
  const habitacionFotosRepo = createHabitacionFotosRepo(db);
  const hotelesRepo = createHotelesRepo(db);
  const userWalletsRepo = createUserWalletsRepo(db);
  const reviewsRepo = createReviewsRepo(db);
  const preferencesRepo = createUserPreferencesRepo(db);
  const userEventsRepo = createUserEventsRepo(db);

  // services
  const authService = createAuthService({ usersRepo });
  const reservasService = createReservasService({ reservasRepo });
  const reservaLegacyService = createReservaLegacyService({ reservasRepo, habitacionesRepo });
  const hotelesService = createHotelesService({ hotelesRepo });
  const habitacionFotosService = createHabitacionFotosService({ fotosRepo: habitacionFotosRepo });
  const habitacionesService = createHabitacionesService({ habitacionesRepo, fotosHabitaciones, habitacionFotosService });
  const ratesService = createRatesService();

  const contractsDir = path.join('C:\\Users\\Camilo Caicedo\\Desktop\\CryptoStay\\frontend\\contracts');
  const web3ConfigService = createWeb3ConfigService({ contractsDir });

  const paymentService = createPaymentService({ reservasRepo, web3ConfigService });
  const userWalletsService = createUserWalletsService({ userWalletsRepo });
  const reviewsService = createReviewsService({ reviewsRepo });
  const preferencesService = createUserPreferencesService({ preferencesRepo });
  const recommendationsService = createRecommendationsService({ habitacionesService, preferencesService, userEventsRepo, web3ConfigService });
  const chatbotService = createChatbotService({ web3ConfigService, habitacionesRepo });

  const upload = createUpload();
  const habitacionFotosController = createHabitacionFotosController({ fotosService: habitacionFotosService, upload });
  const hotelesController = createHotelesController({ hotelesService });

  // controllers
  const authController = createAuthController({ authService });
  const reservasController = createReservasController({ reservasService, reservaLegacyService, paymentService, userWalletsService });
  const habitacionesController = createHabitacionesController({ habitacionesService, hotelesService });
  const ratesController = createRatesController({ ratesService });
  const web3Controller = createWeb3Controller({ web3ConfigService });
  const chatbotController = createChatbotController({ chatbotService });
  const meController = createMeController({ userWalletsService, reservasService });
  const reviewsController = createReviewsController({ reviewsService });
  const preferencesController = createPreferencesController({ preferencesService, userEventsRepo });
  const eventsController = createEventsController({ userEventsRepo });
  const recommendationsController = createRecommendationsController({ recommendationsService });

  return {
    controllers: {
      authController,
      reservasController,
      habitacionesController,
      habitacionFotosController,
      hotelesController,
      ratesController,
      web3Controller,
      chatbotController,
      meController,
      reviewsController,
      preferencesController,
      eventsController,
      recommendationsController,
    },
  };
}

module.exports = { bootstrap };
