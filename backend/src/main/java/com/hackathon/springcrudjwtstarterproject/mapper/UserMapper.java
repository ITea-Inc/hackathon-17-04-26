package com.hackathon.springcrudjwtstarterproject.mapper;

import com.hackathon.springcrudjwtstarterproject.dto.response.UserResponse;
import com.hackathon.springcrudjwtstarterproject.entity.User;

import org.mapstruct.Mapper;


import java.util.List;


@Mapper(componentModel = "spring")
public interface UserMapper {
    List<UserResponse> toUserResponse(List<User> allUsers);
    UserResponse toUserResponse(User user);
}
