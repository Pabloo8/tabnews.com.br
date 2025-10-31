
import { postHandler } from '../../../../pages/api/v1/users'; 
import { randomUUID as uuidV4 } from 'node:crypto';
import { ValidationError } from 'errors'; 
import activation from 'models/activation.js';
import authorization from 'models/authorization.js';
import event from 'models/event.js';
import user from 'models/user.js';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));
jest.mock('models/activation.js', () => ({
  createAndSendActivationEmail: jest.fn(),
}));
jest.mock('models/authorization.js', () => ({
  filterInput: jest.fn(),
  filterOutput: jest.fn(),
}));
jest.mock('models/event.js', () => ({
  create: jest.fn(),
}));
jest.mock('models/user.js', () => ({
  create: jest.fn(),
}));

describe('postHandler - Testes Unitários (Lógica Interna)', () => {
  let mockRequest;
  let mockResponse;
  let mockUuid;
  let mockDateNow;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      context: {
        user: { id: 'admin-user-id' },
        clientIp: '127.0.0.1',
      },
      body: { /* ... */ },
    };
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(() => mockResponse),
    };

    mockUuid = 'mock-uuid-12345';
    mockDateNow = new Date('2025-10-31T18:00:00.000Z');
    uuidV4.mockReturnValue(mockUuid);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDateNow);

  
    authorization.filterOutput.mockImplementation((user, action, data) => data);
  });

  
  describe('SUÍTE A: Lógica de Auditoria [D2: originator_user_id]', () => {
    
    it('CT-01 [D2: (A=V, B=F)] - deve usar o ID da sessão se newUser.id não for retornado', async () => {
   
      user.create.mockResolvedValue({ id: undefined }); 
      mockRequest.context.user.id = 'user-123'; 

  
      await postHandler(mockRequest, mockResponse);

     
      expect(event.create).toHaveBeenCalledWith(
        expect.objectContaining({ originator_user_id: 'user-123' }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('CT-02 [D2: (A=F, B=V)] - deve usar o ID do novo usuário se o ID da sessão for nulo', async () => {
 
      user.create.mockResolvedValue({ id: 'new-456' });
      mockRequest.context.user.id = null; 

      
      await postHandler(mockRequest, mockResponse);

     
      expect(event.create).toHaveBeenCalledWith(
        expect.objectContaining({ originator_user_id: 'new-456' }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('CT-03 [D2: (A=F, B=F)] - deve registrar null/undefined se ambos IDs faltarem', async () => {
     
      user.create.mockResolvedValue({ id: undefined }); 
      mockRequest.context.user.id = null;

     
      await postHandler(mockRequest, mockResponse);

    
      expect(event.create).toHaveBeenCalledWith(
        expect.objectContaining({ originator_user_id: undefined }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  
  describe('SUÍTE B: Lógica Interna do Bloco catch [D1 e D3]', () => {

    it('CT-05 [D1: (A=F)] - deve RELANÇAR o erro se NÃO for um ValidationError', async () => {
  
      

      const dbError = new TypeError('Database connection failed'); 
      user.create.mockRejectedValue(dbError);

     
      await expect(postHandler(mockRequest, mockResponse))
        .rejects.toThrow(dbError);

      expect(mockResponse.status).not.toHaveBeenCalled(); 
    });

    it('CT-06 [D3: (A=V)] - deve TRATAR o erro de email e usar a description fornecida (no catch)', async () => {
     
      

      const emailError = new ValidationError('Email already exists');
      emailError.key = 'email';
      user.create.mockRejectedValue(emailError);
      
      authorization.filterInput.mockReturnValue({
        username: 'testuser',
        description: 'Minha Bio', 
      });

      
      await postHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUuid,
          description: 'Minha Bio',
          created_at: mockDateNow,
        }),
      );
    });
  });
});