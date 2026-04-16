package com.hackathon.springcrudjwtstarterproject.service;

import com.hackathon.springcrudjwtstarterproject.dto.request.RegisterUserRequest;
import com.hackathon.springcrudjwtstarterproject.dto.request.UpdateUserRequest;
import com.hackathon.springcrudjwtstarterproject.dto.response.UserResponse;

import java.util.List;

public interface UserService {
    List<UserResponse> getAllUsers();
    UserResponse getUserById(Long id);
    UserResponse createUser(RegisterUserRequest user);
    UserResponse updateUser(Long id, UpdateUserRequest user);
    boolean deleteUser(Long id);
}
