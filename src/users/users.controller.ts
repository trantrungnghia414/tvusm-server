import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ResponseData } from 'src/global/globalClass';
import { HttpMessage, HttpStatus } from 'src/global/globalEnum';
import { User } from 'src/models/user.model';
import { UsersService } from 'src/users/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(): ResponseData<User[]> {
    try {
      return new ResponseData<User[]>(
        this.usersService.getUsers(),
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch (error) {
      console.error(error);
      return new ResponseData<User[]>([], HttpStatus.ERROR, HttpMessage.ERROR);
    }
  }

  @Get('/:id')
  getUserById(@Param('id') id: number): ResponseData<User> {
    try {
      return new ResponseData<User>(
        this.usersService.getUserById(id),
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch (error) {
      console.error(error);
      return new ResponseData<User>([], HttpStatus.ERROR, HttpMessage.ERROR);
    }
  }

  @Post()
  createUser(): ResponseData<string> {
    try {
      return new ResponseData<string>(
        this.usersService.createUser(),
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch (error) {
      console.error(error);
      return new ResponseData<string>('', HttpStatus.ERROR, HttpMessage.ERROR);
    }
  }

  @Put('/:id')
  updateUser(): ResponseData<string> {
    try {
      return new ResponseData<string>(
        this.usersService.updateUser(),
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch (error) {
      console.error(error);
      return new ResponseData<string>('', HttpStatus.ERROR, HttpMessage.ERROR);
    }
  }

  @Delete('/:id')
  deleteUser(): ResponseData<string> {
    try {
      return new ResponseData<string>(
        this.usersService.deleteUser(),
        HttpStatus.SUCCESS,
        HttpMessage.SUCCESS,
      );
    } catch (error) {
      console.error(error);
      return new ResponseData<string>('', HttpStatus.ERROR, HttpMessage.ERROR);
    }
  }
}
