import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {error} from 'util';
import {Llaves} from '../config/llaves';
import {Credenciales, NotificacionCorreo, Persona} from '../models';
import {PersonaRepository} from '../repositories';
import {NotificacionService} from '../services';
import {AutenticacionService} from '../services/autenticacion.service';
const fetch = require("node-fetch");
const generador = require("password-generator");
const cryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");

export class PersonaController {
  constructor(
    @repository(PersonaRepository)
    public personaRepository: PersonaRepository,

    @service(AutenticacionService)
    public servicioAutenticacion = AutenticacionService,

    @service(NotificacionService)
    public servicioNotificaciones = NotificacionService
  ) {}

  @post('/identificarPersona', {
    responses : {
      '200':{
        description : "Identificación de usuarios"
      }
    }
  } )
  async identificarPersona(
    @requestBody() credenciales : Credenciales
  ){
    //let p = await this.servicioAutenticacion.IdentificarPersona(credenciales.usuario, credenciales.clave)
    let p = await IdentificarPersona(credenciales.usuario, credenciales.clave, this.personaRepository)
    if(p){
      //let token = this.servicioAutenticacion.GenerarTokenJWT(p);
      let token = GenerarTokenJWT(p);
      return {
        datos: {
          nombre: p.nombres,
          correo: p.correo,
          id: p.id,
        },
        tk: token
      }
    }else{
      throw new HttpErrors[401]("Datos inválidos");

    }
  }

  @post('/personas')
  @response(200, {
    description: 'Persona model instance',
    content: {'application/json': {schema: getModelSchemaRef(Persona)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {
            title: 'NewPersona',
            exclude: ['id'],
          }),
        },
      },
    })
    persona: Omit<Persona, 'id'>,
  ): Promise<Persona> {
    // let clave = this.servicioAutenticacion.GenerarClave();
    // let claveCifrada = this.servicioAutenticacion.CifrarClave(clave);
    let clave = GenerarClave();
    let claveCifrada = CifrarClave(clave);
    persona.clave = claveCifrada;
    let p =  await this.personaRepository.create(persona);
    console.log(p)

    //Notificar al usuario
    let notificacion = new NotificacionCorreo();
    notificacion.destinatario = persona.correo;
    notificacion.asunto = "Registro en el sistema";
    notificacion.mensaje = `Hola ${persona.nombres}.<br/> Su nombre de usuario es: ${persona.correo} y su contraseña es: ${clave} `;
    //this.servicioNotificaciones.EnviarCorreo(notificacion);
    EnviarCorreo(notificacion);


    return p;
  }

  @get('/personas/count')
  @response(200, {
    description: 'Persona model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Persona) where?: Where<Persona>): Promise<Count> {
    return this.personaRepository.count(where);
  }

  @get('/personas')
  @response(200, {
    description: 'Array of Persona model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Persona, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Persona) filter?: Filter<Persona>,
  ): Promise<Persona[]> {
    return this.personaRepository.find(filter);
  }

  @patch('/personas')
  @response(200, {
    description: 'Persona PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {partial: true}),
        },
      },
    })
    persona: Persona,
    @param.where(Persona) where?: Where<Persona>,
  ): Promise<Count> {
    return this.personaRepository.updateAll(persona, where);
  }

  @get('/personas/{id}')
  @response(200, {
    description: 'Persona model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Persona, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Persona, {exclude: 'where'})
    filter?: FilterExcludingWhere<Persona>,
  ): Promise<Persona> {
    return this.personaRepository.findById(id, filter);
  }

  @patch('/personas/{id}')
  @response(204, {
    description: 'Persona PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {partial: true}),
        },
      },
    })
    persona: Persona,
  ): Promise<void> {
    await this.personaRepository.updateById(id, persona);
  }

  @put('/personas/{id}')
  @response(204, {
    description: 'Persona PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() persona: Persona,
  ): Promise<void> {
    await this.personaRepository.replaceById(id, persona);
  }

  @del('/personas/{id}')
  @response(204, {
    description: 'Persona DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.personaRepository.deleteById(id);
  }
}

//Notificacion Service
function EnviarCorreo(notificacion : NotificacionCorreo): Boolean{
  let url = `${Llaves.urlServicioNotificaciones}/envio-correo?hash=${Llaves.hash_notificaciones}&correo-destino=${notificacion.destinatario}&asunto=${notificacion.asunto}&contenido=${notificacion.mensaje}`;
  fetch(url)
    .then((data: any)=> true)
  return false;
}


//Autenticacion Service
function GenerarClave(){
  let clave = generador(8, false)
  return clave
}
function CifrarClave(clave: string){
  let claveCifrada = cryptoJS.MD5(clave).toString();
  return claveCifrada;}

function IdentificarPersona(usuario: string, clave: string, personaRepository: PersonaRepository){
try {
  let p = personaRepository.findOne({where:{correo: usuario, clave: clave}});
  if(p){
    return p;
  }
  return false;
} catch{
  return false;
}
}
function GenerarTokenJWT(persona : Persona){
  let token = jwt.sign({
    data:{
      id: persona.id,
      correo: persona.correo,
      nombre: persona.nombres + " " + persona.apellidos
    }
  },
  Llaves.claveJWT);
  return token;
}

function ValidarTokenJWT(token : string){
  try {
    let datos = jwt.verify(token, Llaves.claveJWT);
    return datos;
  } catch {
    return false;
  }
}


