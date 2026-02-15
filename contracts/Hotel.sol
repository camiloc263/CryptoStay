// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Hotel {
    // El dueño del hotel
    address payable public owner;

    // Pagos ligados a una reserva Web2 (reservar en BD y pagar después en chain)
    mapping(uint256 => bool) public reservaPagada;

    // Token estable (mock USDC) para pagos ERC20
    IERC20 public usdc;

    event ReservaPagada(uint256 reservaId, address payer, uint256 amountWei, bytes32 txRef);
    event ReservaPagadaUSDC(uint256 reservaId, address payer, uint256 amount, address token, bytes32 txRef);

    // Estructura de una reserva
    struct Room {
        uint id;
        string name;
        uint pricePerNight;
        bool isBooked;
        address currentGuest;
        string imageUrl; // <--- FOTO
    }

    mapping(uint => Room) public rooms;
    uint public roomCount;

    event RoomCreated(uint id, string name, uint price, string imageUrl);
    event RoomBooked(uint id, address guest, uint price);

    constructor(address usdcAddress) {
        owner = payable(msg.sender);
        usdc = IERC20(usdcAddress);
    }

    function setUSDC(address usdcAddress) external {
        require(msg.sender == owner, "Solo owner");
        usdc = IERC20(usdcAddress);
    }

    // 1. PUBLICAR HABITACIÓN
    function addRoom(string memory _name, uint _price, string memory _imageUrl) public {
        require(msg.sender == owner, "Solo el dueno puede agregar habitaciones");
        
        roomCount++;
        rooms[roomCount] = Room(roomCount, _name, _price, false, address(0), _imageUrl);
        
        emit RoomCreated(roomCount, _name, _price, _imageUrl);
    }

    // 2. RESERVAR (PAGO INMEDIATO - legacy)
    function bookRoom(uint _roomId) public payable {
        Room storage room = rooms[_roomId];
        
        require(room.id != 0, "La habitacion no existe");
        require(!room.isBooked, "Ya esta reservada");
        require(msg.value >= room.pricePerNight, "Dinero insuficiente");

        room.isBooked = true;
        room.currentGuest = msg.sender;

        owner.transfer(msg.value);

        emit RoomBooked(_roomId, msg.sender, msg.value);
    }

    // 3. PAGAR DESPUÉS (Web2 -> Web3)
    // La reserva se crea off-chain (Web2/MySQL) y luego se paga en blockchain usando su ID.
    function pagarReserva(uint256 reservaId) external payable {
        require(!reservaPagada[reservaId], "Reserva ya pagada");
        require(msg.value > 0, "Monto invalido");

        reservaPagada[reservaId] = true;
        owner.transfer(msg.value);

        // txRef: ayuda a vincular en front/back sin exponer datos extra (no es seguridad)
        emit ReservaPagada(reservaId, msg.sender, msg.value, keccak256(abi.encodePacked(reservaId, msg.sender, msg.value, block.number)));
    }

    /// @notice Pay a Web2 reservation using USDC (ERC20). Caller must approve() first.
    function pagarReservaUSDC(uint256 reservaId, uint256 amount) external {
        require(!reservaPagada[reservaId], "Reserva ya pagada");
        require(amount > 0, "Monto invalido");

        reservaPagada[reservaId] = true;

        bool ok = usdc.transferFrom(msg.sender, owner, amount);
        require(ok, "TransferFrom fallo");

        emit ReservaPagadaUSDC(reservaId, msg.sender, amount, address(usdc), keccak256(abi.encodePacked(reservaId, msg.sender, amount, block.number)));
    }
}