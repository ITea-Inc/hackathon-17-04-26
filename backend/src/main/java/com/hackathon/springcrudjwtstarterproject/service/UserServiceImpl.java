package com.hackathon.springcrudjwtstarterproject.service;

import com.hackathon.springcrudjwtstarterproject.dto.request.RegisterUserRequest;
import com.hackathon.springcrudjwtstarterproject.dto.request.UpdateUserRequest;
import com.hackathon.springcrudjwtstarterproject.dto.response.UserResponse;
import com.hackathon.springcrudjwtstarterproject.entity.User;
import com.hackathon.springcrudjwtstarterproject.mapper.UserMapper;
import com.hackathon.springcrudjwtstarterproject.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public List<UserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        if (users == null) {
            // брось кастомное исключение
        }
     }

    @Override
    @Transactional
    public UserResponse getUserById(Long id) {
    }

    @Override
    @Transactional
    public UserResponse createUser(RegisterUserRequest user) {
        return null;
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest user) {
        return null;
    }

    @Override
    @Transactional
    public boolean deleteUser(Long id) {
        return false;
    }
}
