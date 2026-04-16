package com.hackathon.springcrudjwtstarterproject.service;

import com.hackathon.springcrudjwtstarterproject.dto.request.RegisterUserRequest;
import com.hackathon.springcrudjwtstarterproject.dto.request.UpdateUserRequest;
import com.hackathon.springcrudjwtstarterproject.dto.response.UserResponse;
import com.hackathon.springcrudjwtstarterproject.entity.User;
import com.hackathon.springcrudjwtstarterproject.exception.UserAlreadyExistsException;
import com.hackathon.springcrudjwtstarterproject.exception.UserNotFoundException;
import com.hackathon.springcrudjwtstarterproject.mapper.UserMapper;
import com.hackathon.springcrudjwtstarterproject.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public List<UserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        return userMapper.toUserResponse(users);
     }

    @Override
    @Transactional
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> {
            throw new UserNotFoundException(id);
        });
        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional
    public UserResponse createUser(RegisterUserRequest user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new UserAlreadyExistsException("username", user.getUsername());
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new UserAlreadyExistsException("email", user.getEmail());
        }
        User newUser = new User();
        newUser.setUsername(user.getUsername());
        newUser.setEmail(user.getEmail());
        newUser.setPassword_hash(passwordEncoder.encode(user.getPassword()));

        return userMapper.toUserResponse(userRepository.save(newUser));
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("email", request.getEmail());
        }
        if (!user.getUsername().equals(request.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("username", request.getUsername());
        }

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public boolean deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException(id);
        }
        userRepository.deleteById(id);
        return true;
    }
}
